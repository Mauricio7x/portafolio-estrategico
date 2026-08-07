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
     j. EDITOR DE APU (ago 2026). Las seis acciones de /api/apu/[accion] —una
        sola función, porque el plan Hobby de Vercel admite 12 por despliegue y
        el repositorio ya estaba en 12; por eso `/api/apu/catalogo` se plegó
        ahí, conservando URL, contrato y su condición de PÚBLICO—. Corre ANTES
        de h-bis para poder probar el estado «sin catálogo cargado», y limpia
        `apu:*` al terminar para que h-bis empiece de cero.
        Tres familias de invariantes:
          · ARITMÉTICAS: `cantidad × unitario = total` por fila y los cuatro
            componentes suman el costo directo. Es la corrección de fondo al
            encargo, que sumaba un TOTAL de mano de obra a unos materiales
            UNITARIOS y volvía a multiplicar por la cantidad — cobrando la
            cuadrilla `cantidad` veces. También que el AIU ADITIVO (el de los
            pliegos tipo) da menos que el compuesto: si dieran igual, la
            corrección no estaría aplicada. Y que el catálogo de Redis y la
            semilla del repositorio dan el MISMO costo directo: son la misma
            tabla por dos caminos.
          · DE MONOTONÍA: bajar el rendimiento ENCARECE (el rendimiento divide,
            y un signo invertido ahí es el error canónico del APU) sin tocar los
            materiales; el override no puede mutar el catálogo compartido; y más
            anticipo no puede exigir más financiación propia.
          · DE HONESTIDAD: un ítem que no está en el catálogo NO suma cero al
            total; un departamento sin región cotizada no se asigna a la más
            parecida ni recibe factor de relleno —sale «sin_base» con su motivo,
            y el presupuesto se calcula igual con la región base DICIÉNDOLO—;
            `anticipo_pct` distingue `null` (sin dato) de `0` (sin anticipo); y
            un borrador corrupto se CUENTA en vez de tumbar el listado.
        Más: los tres estados de la inferencia suman los objetos evaluados, el
        UNSPSC VETA (placa huella + código de acueducto → 🟡), una tipología sin
        ítems en el catálogo lo dice, el decimal colombiano («1.500» son mil
        quinientos) y la regla de atribución (un número de contrato no es una
        cantidad); persistencia por perfil con TTL de 30 días REALMENTE puesto;
        y el .xlsx generado se audita entrada por entrada —fuentes, negrita,
        relleno, formato de moneda, celdas combinadas y escape del XML—, que es
        justo lo que la edición libre de SheetJS descarta en silencio al
        escribir.
     h-bis. Catálogo de precios APU (lib/apu/catalogo + los dos endpoints): el
        esquema literal del encargo leído de Redis (`apu:insumos:*` con unidad,
        `precio_{region}` y fecha; `apu:items:*` con descripción, unidad,
        segmento UNSPSC y la composición en JSON; `apu:factores_region:*` con
        los cuatro factores, el AIU y el prestacional). Carga protegida (401 sin
        token, 401 con token malo, 503 sin la variable, y un rechazo no escribe
        nada), consulta PÚBLICA, idempotencia (segundo POST no reescribe;
        `?forzar=true` sí, con sello nuevo) y las tres funciones del encargo
        leyendo Redis. La invariante fuerte: el SNAPSHOT comprimido y los HASHES
        devuelven exactamente lo mismo, y un snapshot rancio o con un chunk
        corrupto cae a los hashes en vez de servir el catálogo anterior.
        Aparte, en las unidades: las cuadrillas son la suma de sus jornales, el
        índice regional recompuesto no se separa 0,015 del recuperado y el
        acarreo del acero va en m³ (el error de la fuente recuperada, que lo
        pasaba en kg y ponía el 78 % del APU en transporte).
     j-bis. RENTABILIDAD del proceso y badge «APU listo». La acción
        /api/apu/rentabilidad es la ÚNICA del módulo que toca la red (índice de
        baja + índice de competencia + lib/probabilidad), y de ahí que vaya
        aparte de `calcular`, que es aritmética pura. Se comprueban los seis
        indicadores del encargo —precio, costo directo, margen bruto, P(ganar),
        VEG y payback—, que el precio de la rentabilidad sea EL MISMO que el del
        presupuesto, que el ajuste competitivo salga del índice REAL (y que sin
        base no invente un precio), el precio piso decidiendo con σ = 15 %, las
        monotonías del anexo A.4 (A.9 anticipo↑ ⇒ K_max no sube; A.10 oferentes↑
        ⇒ P(ganar) no sube y MG(n) no baja; A.12 DSO↑ ⇒ C_financiero no baja), y
        que el borrador quede asociado a su `id_proceso` — que es lo único con lo
        que el panel puede encender «APU listo», y es POR PERFIL.
     j-ter. OPTIMIZADOR DE PRECIO DE OFERTA (lib/apu/optimizador + el bloque
        `optimizador` de /api/apu/rentabilidad). Barre el rango de bajas
        plausibles llamando a `rentabilidad()` una vez por punto y devuelve el
        precio que MAXIMIZA el valor esperado, con la curva entera.
        Lo que se vigila no es la aritmética del barrido sino tres confusiones:
          · DOS DESCUENTOS QUE NO SON EL MISMO NÚMERO — la baja contra el
            presupuesto oficial (la del mercado, la que se compara con la
            mediana) y la perilla «factor de baja» del editor (contra el precio
            de venta). En el corpus el precio de venta es el 69 % de la cuantía:
            confundirlas mueve el precio un tercio. Hay prueba de que el botón
            escribe `descuento_apu_pct` y NO `descuento`, y un viaje de ida y
            vuelta por los handlers reales —incluido el caso con precio final
            CON DECIMALES, que es donde se rompería.
          · DOS CÁLCULOS DE LA MISMA CIFRA — el punto de la curva evaluado en el
            precio vigente reproduce EXACTAMENTE el bloque de rentabilidad (VEG,
            P, margen y K_max), y el punto en la mediana del mercado devuelve
            EXACTAMENTE la `p` que publica /api/oportunidades.
          · UNA RECOMENDACIÓN FABRICADA — sin centro de mercado, sin presupuesto
            oficial o sin costo directo NO sale un «óptimo»: sale el motivo.
        Más: la rejilla recortada en descuento 0 (ofertar por encima del techo
        descalifica), las monotonías que no dependen del modelo (más descuento ⇒
        menos precio y menos margen) y la que sí pero solo donde es demostrable
        (por DEBAJO de la mediana la probabilidad no puede caer), las tres
        opciones como extremos de la MESETA del VEG —con un caso de máximo
        interior donde son tres precios distintos—, y que escalar la `p` base no
        mueva el precio recomendado (el precio se cobra dos veces en
        docs/PROBABILIDAD_MEJORADA §2.5c: afecta al NIVEL del VEG, no al argmax).
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
        urlproceso: { url: `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.${n}` },
        tipo_de_contrato: "Obra",
      };
      /* EL CONTEO DE OFERENTES ES EX-POST y el fixture tiene que reproducirlo
         (ago 2026). SECOP II NO publica `respuestas_al_procedimiento` mientras
         el proceso está abierto: solo aparece cuando ya cerró. El fixture lo
         daba a TODAS las filas, y eso tapaba un defecto real —`nivel_competencia`
         parecía una señal viva en las pruebas cuando en producción vale «baja»
         para todo el corpus activo, que por construcción solo tiene procesos
         abiertos—. Los adjudicados sí lo llevan: son los que alimentan el
         histórico y el índice de competencia, y ahí el dato existe de verdad. */
      if (f.estado_del_procedimiento === "Adjudicado") f.respuestas_al_procedimiento = String(i % 20);

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
    tipo_de_contrato: "Obra",   // sin conteo de oferentes: están ABIERTOS (ver arriba)
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

/* ---- bloque para la BAJA POR MODALIDAD (ago 2026) ----
   El resto del corpus histórico generado es TODO «Licitación pública», así que
   sin este bloque la prueba de `?modalidad=` comprobaría el cableado sobre una
   sola cubeta: filtraría, sí, pero no podría demostrar que dos modalidades dan
   respuestas DISTINTAS, que es justamente el defecto que se corrige.

   Una entidad que hace las dos cosas: seis licitaciones públicas que descuentan
   ~10 % y seis mínimas cuantías adjudicadas por el presupuesto oficial (0 %). La
   mediana MEZCLADA de esa entidad queda a medio camino y no describe a ninguna
   de las dos, que es el problema en una sola frase.

   Tres precauciones, las tres heredadas de los bloques de arriba:
     · ENTIDAD Y DEPARTAMENTO PROPIOS, para no mover las cifras de ninguna
       entidad que otras pruebas ya auditan con conteos exactos.
     · SIN `numero_de_ofertas`, para que el índice de competencia los cuente como
       «sin dato» y los tertiles no se muevan ni un milímetro.
     · CÓDIGO YA INSCRITO en el RUP de Helder (72141000, el mismo que usan los
       demás fixtures), para no fabricar un «código faltante» que descuadraría la
       auditoría de cobertura. */
const ENTIDAD_MODALIDAD = "MUNICIPIO DE DOS MODALIDADES";
const MODALIDAD_BLOQUES = [
  { modalidad: "Licitación pública", n: 6, baja: 10 },
  { modalidad: "Mínima cuantía", n: 6, baja: 0 },
];
const HIST_MODALIDAD = MODALIDAD_BLOQUES.reduce((a, b) => a + b.n, 0);

function generarDatasetModalidad() {
  const filas = [];
  let i = 0;
  for (const b of MODALIDAD_BLOQUES) {
    for (let k = 0; k < b.n; k++) {
      i++;
      const mes = MESES_HIST[(i * 11) % MESES_HIST.length];
      const base = 500e6;
      filas.push({
        ":id": `mod-${String(i).padStart(4, "0")}`, ":updated_at": `${mes}-19T10:00:00.000Z`,
        id_del_proceso: `CO1.MOD.${i}`, referencia_del_proceso: `REF-MOD-${i}`,
        fecha_de_publicacion_del: `${mes}-06T08:00:00.000`,
        entidad: ENTIDAD_MODALIDAD, nit_entidad: "800100011",
        ciudad_entidad: "SAN JUAN", departamento_entidad: "Casanare",
        modalidad_de_contratacion: b.modalidad,
        estado_del_procedimiento: "Adjudicado", fase: "Adjudicación", adjudicado: "Si",
        precio_base: String(base),
        duracion: "6", unidad_de_duracion: "Meses",
        nombre_del_procedimiento: "CONSTRUCCION DE PLACA HUELLA EN VIA TERCIARIA",
        descripci_n_del_procedimiento: "Obra civil de pavimentacion rural en concreto",
        codigo_principal_de_categoria: "V1.72141000", tipo_de_contrato: "Obra",
        // SIN numero_de_ofertas: no pueden mover los tertiles del índice
        nombre_del_proveedor: `CONSTRUCTORA MOD ${i} SAS`,
        nit_del_proveedor_adjudicado: `90060${String(i).padStart(4, "0")}`,
        valor_total_adjudicacion: String(Math.round(base * (1 - b.baja / 100))),
        fecha_adjudicacion: `${mes}-27T10:00:00.000`,
        urlproceso: { url: `https://community.secop.gov.co/mod/${i}` },
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
  const indiceBajaApi = require("../api/indice-baja.js");
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

  /* unidad: ÍNDICE DE BAJA DE MERCADO (lib/indice_baja) ─────────────────────
     Se construye contra un Redis de mentira con chunks históricos escritos a
     mano: así los ocho casos fijan EXACTAMENTE el umbral que se quiere probar,
     que con el corpus generado del fixture dependería del azar del generador. */
  {
    const indiceBaja = require("../lib/indice_baja.js");
    const { comprimir, CLAVES } = require("../lib/almacen.js");

    /* Redis mínimo: solo lo que usa construirIndiceBaja/leerIndiceBaja. */
    function redisFalso(filasPorMes) {
      const kv = new Map(), hashes = new Map();
      for (const [mes, filas] of Object.entries(filasPorMes)) {
        kv.set(`licitaciones:historico:mes:${mes}:chunk:0`, comprimir(filas));
      }
      const like = (p) => new RegExp("^" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*") + "$");
      return {
        scan: async (p) => [...kv.keys()].filter((k) => like(p).test(k)),
        mget: async (ks) => ks.map((k) => kv.get(k) ?? null),
        get: async (k) => kv.get(k) ?? null,
        set: async (k, v) => { kv.set(k, v); return "OK"; },
        del: async (...ks) => { for (const k of ks.flat()) { kv.delete(k); hashes.delete(k); } return 1; },
        hset: async (k, obj) => {
          const h = hashes.get(k) || {};
          for (const [f, v] of Object.entries(obj)) h[f] = JSON.stringify(v);
          hashes.set(k, h); return 1;
        },
        hgetall: async (k) => hashes.get(k) || {},
        rename: async (a, b) => { hashes.set(b, hashes.get(a) || {}); hashes.delete(a); return "OK"; },
      };
    }

    /* `pb` presupuesto, `baja` en %, y el resto de campos que exigen los filtros */
    const proc = (id, entidad, baja, extra = {}) => ({
      _k: `p-${id}`, ":updated_at": "2025-03-01T00:00:00.000",
      entidad, nit_entidad: "800000000",
      departamento_entidad: extra.depto || "ANTIOQUIA",
      codigo_principal_de_categoria: extra.codigo || "72141100",
      precio_base: "1000000000",
      valor_total_adjudicacion: String(Math.round(1000000000 * (1 - baja / 100))),
      nit_del_proveedor_adjudicado: "901234567",
      nombre_del_proveedor: "CONSTRUCTORA DE PRUEBA SAS",
      ...extra.campos,
    });

    // 5 procesos de AGRESIVA con baja 5-10 %, 3 de MODERADA con baja 0-2 %
    const AGRESIVA = "AGENCIA AGRESIVA DE INFRAESTRUCTURA";
    const MODERADA = "ALCALDIA MODERADA";
    const filas = [
      proc(1, AGRESIVA, 6), proc(2, AGRESIVA, 7), proc(3, AGRESIVA, 8),
      proc(4, AGRESIVA, 9), proc(5, AGRESIVA, 10),
      // MODERADA va en OTRO departamento a propósito: si compartiera el de
      // AGRESIVA, su falta de base propia caería al fallback departamental y el
      // caso 3 mediría el fallback en vez del mínimo de procesos.
      proc(6, MODERADA, 0, { depto: "CALDAS" }),
      proc(7, MODERADA, 1, { depto: "CALDAS" }),
      proc(8, MODERADA, 2, { depto: "CALDAS" }),
    ];

    /* 0. CÁLCULO sobre un proceso sintético: baja = (base − adjudicado)/base.
       1.000M de presupuesto y 850M adjudicados son exactamente 15 %. Se
       construye con cinco iguales para superar el mínimo y poder leer la cifra
       publicada, que es la única forma de comprobar el cálculo de extremo a
       extremo (el histograma redondea a punto porcentual entero). */
    {
      const uno = (i) => ({
        _k: `s-${i}`, ":updated_at": "2025-03-01T00:00:00.000",
        entidad: "ENTIDAD SINTETICA", nit_entidad: "800000001",
        departamento_entidad: "BOGOTA", codigo_principal_de_categoria: "72141100",
        precio_base: "1000000000", valor_total_adjudicacion: "850000000",
        nit_del_proveedor_adjudicado: "901234567",
      });
      const rs = redisFalso({ "2025-03": [1, 2, 3, 4, 5].map(uno) });
      const meta = await indiceBaja.construirIndiceBaja(rs);
      assert.strictEqual(meta.procesos_analizados, 5);
      assert.strictEqual(meta.baja_mediana_global, 15, "1.000M → 850M tiene que ser 15 % de baja");
      const b = indiceBaja.bajaDeMercado(await indiceBaja.leerIndiceBaja(rs),
        { entidad: "ENTIDAD SINTETICA", departamento_entidad: "BOGOTA", codigo_principal_de_categoria: "72141100" });
      assert.strictEqual(b.baja_mediana, 15);
      assert.strictEqual(b.baja_promedio, 15, "el promedio y la mediana coinciden con cinco valores iguales");
      assert.strictEqual(b.nivel, "alto", "15 % de baja está por encima del corte del 5 %");
    }

    /* 1. se construye y analiza los 8 */
    let redis = redisFalso({ "2025-03": filas });
    let r = await indiceBaja.construirIndiceBaja(redis);
    assert.strictEqual(r.done, true, "el índice de baja no terminó");
    assert.strictEqual(r.procesos_analizados, 8, `analizados: ${r.procesos_analizados}`);
    let idx = await indiceBaja.leerIndiceBaja(redis);

    /* 2. la entidad que baja 5-10 % se clasifica «alto» */
    const bAgresiva = indiceBaja.bajaDeMercado(idx, { entidad: AGRESIVA, departamento_entidad: "ANTIOQUIA", codigo_principal_de_categoria: "72141100" });
    assert.strictEqual(bAgresiva.nivel, "alto", `AGRESIVA debía ser «alto»: ${JSON.stringify(bAgresiva)}`);
    assert.strictEqual(bAgresiva.baja_mediana, 8, `mediana de AGRESIVA: ${bAgresiva.baja_mediana}`);
    assert.strictEqual(bAgresiva.procesos_contados, 5);

    /* 3. la que baja 0-2 % NO se clasifica: son 3 procesos y el mínimo es 5.
       Es la regla de siempre —ninguna cifra derivada por debajo del mínimo— y
       el conteo SÍ viaja, porque es un hecho y explica el gris de la tarjeta. */
    const bModerada = indiceBaja.bajaDeMercado(idx, { entidad: MODERADA, departamento_entidad: "CALDAS", codigo_principal_de_categoria: "72141100" });
    assert.strictEqual(bModerada.nivel, "sin_dato", "3 procesos no pueden clasificar");
    assert.strictEqual(bModerada.baja_mediana, null, "sin base no se publica mediana");
    assert.strictEqual(bModerada.procesos_contados, 3, "el conteo es un hecho y tiene que viajar");
    // y NO se toma prestada la cifra de la otra entidad: son departamentos
    // distintos y ninguno de los dos niveles de respaldo tiene base
    assert.strictEqual(bModerada.granularidad_utilizada, null,
      "sin base en ningún nivel, la granularidad utilizada tiene que ser null");
    // con 5 procesos de baja 0-2 % sí sale «bajo»
    const redisB = redisFalso({ "2025-03": [
      proc(10, MODERADA, 0), proc(11, MODERADA, 1), proc(12, MODERADA, 1),
      proc(13, MODERADA, 2), proc(14, MODERADA, 2),
    ] });
    await indiceBaja.construirIndiceBaja(redisB);
    const bModerada5 = indiceBaja.bajaDeMercado(await indiceBaja.leerIndiceBaja(redisB),
      { entidad: MODERADA, departamento_entidad: "ANTIOQUIA", codigo_principal_de_categoria: "72141100" });
    assert.strictEqual(bModerada5.nivel, "bajo", `con 5 procesos al 0-2 % debía ser «bajo»: ${JSON.stringify(bModerada5)}`);

    /* 4. entidad+familia MANDA sobre entidad sola.
       AGRESIVA baja 8 % en la familia 7214 pero solo 1 % en la 8110: si la
       cascada respondiera con el agregado de la entidad, la consultoría
       heredaría el descuento de la obra vial. */
    const mixto = [
      proc(20, AGRESIVA, 8, { codigo: "72141100" }), proc(21, AGRESIVA, 8, { codigo: "72141100" }),
      proc(22, AGRESIVA, 8, { codigo: "72141100" }), proc(23, AGRESIVA, 9, { codigo: "72141100" }),
      proc(24, AGRESIVA, 9, { codigo: "72141100" }),
      proc(25, AGRESIVA, 1, { codigo: "81101500" }), proc(26, AGRESIVA, 1, { codigo: "81101500" }),
      proc(27, AGRESIVA, 1, { codigo: "81101500" }), proc(28, AGRESIVA, 0, { codigo: "81101500" }),
      proc(29, AGRESIVA, 0, { codigo: "81101500" }),
    ];
    const redisM = redisFalso({ "2025-03": mixto });
    await indiceBaja.construirIndiceBaja(redisM);
    const idxM = await indiceBaja.leerIndiceBaja(redisM);
    const vial = indiceBaja.bajaDeMercado(idxM, { entidad: AGRESIVA, departamento_entidad: "ANTIOQUIA", codigo_principal_de_categoria: "72141100" });
    const consult = indiceBaja.bajaDeMercado(idxM, { entidad: AGRESIVA, departamento_entidad: "ANTIOQUIA", codigo_principal_de_categoria: "81101500" });
    assert.strictEqual(vial.granularidad_utilizada, "entidad_familia", "debía responder la familia, no la entidad");
    assert.strictEqual(consult.granularidad_utilizada, "entidad_familia");
    assert.strictEqual(vial.nivel, "alto", `obra vial: ${JSON.stringify(vial)}`);
    assert.strictEqual(consult.nivel, "bajo", `consultoría: ${JSON.stringify(consult)}`);
    assert.ok(vial.baja_mediana > consult.baja_mediana,
      "la familia tiene que distinguir obra vial de consultoría dentro de la MISMA entidad");

    /* 5. fallback a departamento+familia cuando la entidad no tiene base propia.
       Cinco alcaldías distintas del mismo departamento y familia: ninguna llega
       al mínimo por sí sola, pero el departamento sí. */
    const porDepto = [1, 2, 3, 4, 5].map((i) => proc(30 + i, `ALCALDIA MUNICIPAL ${i}`, 6, { depto: "CHOCO" }));
    const redisD = redisFalso({ "2025-03": porDepto });
    await indiceBaja.construirIndiceBaja(redisD);
    const idxD = await indiceBaja.leerIndiceBaja(redisD);
    const nueva = { entidad: "ALCALDIA MUNICIPAL 1", departamento_entidad: "CHOCO", codigo_principal_de_categoria: "72141100" };
    const bDepto = indiceBaja.bajaDeMercado(idxD, nueva);
    assert.strictEqual(bDepto.granularidad_utilizada, "departamento_familia",
      `sin base de entidad debía caer al departamento: ${JSON.stringify(bDepto)}`);
    assert.strictEqual(bDepto.procesos_contados, 5);
    assert.ok(/CHOCO/.test(bDepto.mensaje), "el mensaje debe decir que la cifra es del departamento, no de la entidad");

    /* 6. adjudicado < 30 % del oficial → fuera (lotes parciales) */
    const conLotes = redisFalso({ "2025-03": [
      ...filas.slice(0, 5),
      proc(40, AGRESIVA, 75), proc(41, AGRESIVA, 90),   // baja 75 % y 90 % = adjudicado al 25 % y 10 %
    ] });
    const rLotes = await indiceBaja.construirIndiceBaja(conLotes);
    assert.strictEqual(rLotes.descartados.bajo_30_pct, 2, `lotes parciales descartados: ${rLotes.descartados.bajo_30_pct}`);
    assert.strictEqual(rLotes.procesos_analizados, 5, "los lotes parciales no pueden entrar al promedio");

    /* 7. adjudicado > 110 % del oficial → fuera (dato malo) */
    const conSobre = redisFalso({ "2025-03": [
      ...filas.slice(0, 5),
      proc(50, AGRESIVA, -15), proc(51, AGRESIVA, -30),  // adjudicado al 115 % y 130 %
    ] });
    const rSobre = await indiceBaja.construirIndiceBaja(conSobre);
    assert.strictEqual(rSobre.descartados.sobre_110_pct, 2, `sobre el 110 % descartados: ${rSobre.descartados.sobre_110_pct}`);
    assert.strictEqual(rSobre.procesos_analizados, 5);
    // y una baja negativa LEVE (−5 %) sí se conserva: no es un error de dato
    const conLeve = redisFalso({ "2025-03": [...filas.slice(0, 5), proc(52, AGRESIVA, -5)] });
    assert.strictEqual((await indiceBaja.construirIndiceBaja(conLeve)).procesos_analizados, 6,
      "una baja negativa leve es un dato válido, no un error");

    /* 7-bis. adjudicatario «No Definido» → fuera: no hubo ganador, así que su
       valor adjudicado no es un precio de mercado. */
    const sinGanador = redisFalso({ "2025-03": [
      ...filas.slice(0, 5),
      proc(60, AGRESIVA, 5, { campos: { nit_del_proveedor_adjudicado: "No Definido" } }),
    ] });
    const rSinG = await indiceBaja.construirIndiceBaja(sinGanador);
    assert.strictEqual(rSinG.descartados.adjudicatario_no_definido, 1,
      "«No Definido» no es un adjudicatario real");

    /* 7-ter. el swap es ATÓMICO y no deja restos: reconstruir con menos datos
       no puede dejar vivos los grupos de la corrida anterior. */
    const idxTrasSwap = await indiceBaja.leerIndiceBaja(conLeve);
    assert.ok(!Object.keys(idxTrasSwap.entidad).some((k) => /moderada/i.test(k)),
      "el índice conservó entidades de una construcción anterior: el swap no fue limpio");

    /* 7-quater. el cero NO es «sin dato» aquí. Cinco procesos adjudicados
       exactamente por el presupuesto son un hecho —la entidad no descuenta— y
       tienen que clasificar «bajo», no desaparecer. */
    const todoCero = redisFalso({ "2025-03": [0, 0, 0, 0, 0].map((b, i) => proc(70 + i, MODERADA, b)) });
    const rCero = await indiceBaja.construirIndiceBaja(todoCero);
    assert.strictEqual(rCero.procesos_analizados, 5, "una baja de 0 % es un dato, no una ausencia");
    assert.strictEqual(rCero.baja_exactamente_cero, 5);
    assert.strictEqual(rCero.baja_mediana_global, 0);
    const bCero = indiceBaja.bajaDeMercado(await indiceBaja.leerIndiceBaja(todoCero),
      { entidad: MODERADA, departamento_entidad: "ANTIOQUIA", codigo_principal_de_categoria: "72141100" });
    assert.strictEqual(bCero.nivel, "bajo", "adjudicar por el presupuesto es «baja baja», no «sin dato»");
    assert.strictEqual(bCero.baja_mediana, 0);

    /* 7-quinquies. el ajuste de probabilidad usa la baja y NO la inventa */
    const probabilidad = require("../lib/probabilidad.js");
    const ctx = { competencia: { nivel: "media", promedio_oferentes: 4, total_procesos: 30 } };
    const pNeutro = probabilidad.estimarPDetalle({}, ctx).p;
    const pAlta = probabilidad.estimarPDetalle({}, { ...ctx, baja: bAgresiva }).p;
    const pBaja = probabilidad.estimarPDetalle({}, { ...ctx, baja: bCero }).p;
    assert.ok(pAlta < pNeutro, "una entidad que descuenta mucho debe bajar P(ganar a buen precio)");
    assert.ok(pBaja > pNeutro, "una entidad que adjudica cerca del oficial debe subirla");
    assert.strictEqual(probabilidad.estimarPDetalle({}, { ...ctx, baja: bModerada }).p, pNeutro,
      "una baja «sin_dato» no puede mover la probabilidad");

    /* ══════════════ 8. BAJA POR MODALIDAD (ago 2026) ══════════════
       EL DEFECTO, reproducido: una entidad que hace las dos cosas. Ocho mínimas
       cuantías adjudicadas por el presupuesto oficial (0 %) y seis licitaciones
       públicas que descuentan de verdad (8-13 %). La mediana MEZCLADA es 0 %, y
       leída como «aquí no hay que descontar» se pierde toda licitación pública
       de esa entidad. La cifra no estaba mal calculada: estaba mal AGRUPADA. */
    const MIXTA = "ALCALDIA MIXTA";
    const procMod = (id, baja, modalidad) => proc(id, MIXTA, baja, {
      campos: { modalidad_de_contratacion: modalidad },
    });
    const filasMod = [
      ...[8, 9, 10, 11, 12, 13].map((b, i) => procMod(`lp${i}`, b, "Licitación pública")),
      ...[0, 0, 0, 0, 0, 0, 0, 0].map((b, i) => procMod(`mc${i}`, b, "Mínima cuantía")),
    ];
    {
      const rs = redisFalso({ "2025-03": filasMod });
      const meta = await indiceBaja.construirIndiceBaja(rs);
      assert.strictEqual(meta.procesos_analizados, 14);
      assert.strictEqual(meta.baja_mediana_global, 0,
        "la mediana mezclada tiene que seguir siendo 0 %: es el defecto, y si cambiara la prueba no lo estaría midiendo");

      assert.ok(meta.por_modalidad && typeof meta.por_modalidad === "object",
        "la meta del índice de baja tiene que publicar `por_modalidad`");
      const gLP = meta.por_modalidad["licitacion publica"];
      const gMC = meta.por_modalidad["minima cuantia"];
      assert.ok(gLP && gMC, "las dos modalidades tienen que tener cubeta global");
      assert.strictEqual(gLP.baja_mediana, 10, "licitación pública descuenta el 10 %, y la global lo escondía");
      assert.strictEqual(gLP.nivel, "alto");
      assert.strictEqual(gMC.baja_mediana, 0);
      assert.strictEqual(gMC.nivel, "bajo");
      assert.strictEqual(gLP.etiqueta, "Licitación pública",
        "se AGRUPA por la clave canónica y se MUESTRA la original, igual que claveCanonica/nombre en las entidades");

      /* LAS CUBETAS SUMAN LOS ANALIZADOS. Sin esta igualdad, una modalidad
         podría perderse por el camino —un literal nuevo del dataset, una
         excluida que ya no casa— y nadie lo notaría: las cifras seguirían
         pareciendo razonables, solo que sobre menos procesos. Es la misma
         invariante que exige el embudo de /api/diagnostico. */
      const enCubetas = Object.values(meta.por_modalidad).reduce((a, s) => a + s.procesos, 0);
      assert.strictEqual(enCubetas + meta.sin_modalidad, meta.procesos_analizados,
        "las cubetas de modalidad más `sin_modalidad` deben sumar EXACTAMENTE los analizados");

      /* La cascada refina DENTRO del nivel: mismo `granularidad_utilizada`, y
         `modalidad_utilizada` es lo que dice si hubo refinamiento. Son dos
         preguntas distintas y por eso son dos campos distintos. */
      const idxM = await indiceBaja.leerIndiceBaja(rs);
      const base = { entidad: MIXTA, departamento_entidad: "ANTIOQUIA", codigo_principal_de_categoria: "72141100" };
      const bLP = indiceBaja.bajaDeMercado(idxM, { ...base, modalidad_de_contratacion: "Licitación pública" });
      const bMC = indiceBaja.bajaDeMercado(idxM, { ...base, modalidad_de_contratacion: "Mínima cuantía" });
      assert.strictEqual(bLP.baja_mediana, 10, "un proceso de licitación pública tiene que ver la baja de licitación pública");
      assert.strictEqual(bLP.nivel, "alto");
      assert.strictEqual(bLP.modalidad_utilizada, "licitacion publica");
      assert.strictEqual(bMC.baja_mediana, 0);
      assert.strictEqual(bMC.modalidad_utilizada, "minima cuantia");
      assert.strictEqual(bLP.granularidad_utilizada, bMC.granularidad_utilizada,
        "la modalidad refina DENTRO del nivel: no puede cambiar la granularidad que respondió");
      assert.ok(/Licitación pública/.test(bLP.mensaje),
        "el mensaje tiene que decir de qué modalidad habla, y con la ortografía del dataset");

      /* Un proceso SIN modalidad legible cae a la cifra mezclada, no a un error
         ni a una de las dos cubetas elegida a dedo. */
      const bMezcla = indiceBaja.bajaDeMercado(idxM, base);
      assert.strictEqual(bMezcla.modalidad_utilizada, null);
      assert.strictEqual(bMezcla.baja_mediana, 0, "sin modalidad se responde la mezclada, que aquí es 0 %");
      assert.strictEqual(bMezcla.procesos_contados, 14, "…y sobre los 14 procesos, no sobre una cubeta");
      // `modalidad: null` explícito desactiva el refinamiento: es lo que permite
      // comparar las dos cifras sin construir un proceso falso
      assert.strictEqual(
        indiceBaja.bajaDeMercado(idxM, { ...base, modalidad_de_contratacion: "Licitación pública" }, { modalidad: null }).baja_mediana,
        0, "`modalidad: null` tiene que devolver la mezclada aunque el proceso traiga modalidad");

      /* Una cubeta POR DEBAJO del mínimo no publica cifra y la cascada cae a la
         mezclada. Es la lección de «18,2 oferentes en 0 procesos» aplicada a la
         partición nueva: partir en más cubetas hace más fácil quedarse sin
         muestra, así que el umbral tiene que seguir mandando. */
      const rsPoco = redisFalso({ "2025-03": [
        ...[0, 0, 0, 0, 0, 0].map((b, i) => procMod(`z${i}`, b, "Mínima cuantía")),
        ...[9, 10].map((b, i) => procMod(`y${i}`, b, "Licitación pública")),
      ] });
      await indiceBaja.construirIndiceBaja(rsPoco);
      const idxPoco = await indiceBaja.leerIndiceBaja(rsPoco);
      const bPoco = indiceBaja.bajaDeMercado(idxPoco, { ...base, modalidad_de_contratacion: "Licitación pública" });
      assert.strictEqual(bPoco.modalidad_utilizada, null,
        "2 procesos no son base: la cubeta no puede publicar cifra");
      assert.strictEqual(bPoco.baja_mediana, 0, "y se responde la mezclada de la entidad");
      const cubetaPoco = idxPoco.entidad[Object.keys(idxPoco.entidad)[0]].por_modalidad["licitacion publica"];
      assert.strictEqual(cubetaPoco.procesos, 2, "el CONTEO sí se publica: es un hecho y explica el ⚪");
      assert.strictEqual(cubetaPoco.baja_mediana, null, "…pero ninguna cifra derivada por debajo del mínimo");
    }

    /* COMPATIBILIDAD: `indice:baja` NO SE PURGA NUNCA, así que en producción
       sigue vivo el hash que escribió la versión anterior, SIN `por_modalidad`.
       Si `bajaDeMercado` no se degradara sola, desplegar dejaría la app sin baja
       hasta que alguien reconstruyera el índice a mano — el mismo defecto que
       obligó a inventar `claveLegado` en el índice de competencia. */
    {
      const rs = redisFalso({ "2025-03": filasMod });
      await indiceBaja.construirIndiceBaja(rs);
      const idxViejo = await indiceBaja.leerIndiceBaja(rs);
      for (const mapa of Object.values(idxViejo)) {
        for (const reg of Object.values(mapa)) delete reg.por_modalidad;   // el hash de ayer
      }
      const b = indiceBaja.bajaDeMercado(idxViejo, {
        entidad: MIXTA, departamento_entidad: "ANTIOQUIA",
        codigo_principal_de_categoria: "72141100",
        modalidad_de_contratacion: "Licitación pública",
      });
      assert.strictEqual(b.baja_mediana, 0, "sin `por_modalidad` se responde la mezclada de siempre");
      assert.strictEqual(b.modalidad_utilizada, null);
      assert.strictEqual(b.procesos_contados, 14);
      assert.ok(b.nivel && b.mensaje, "y la respuesta sigue completa: nada de undefined por el campo que falta");
    }

    /* LAS CUBETAS NO SON UNA SEGUNDA LISTA BLANCA. `modalidadCanonica` tiene que
       aceptar EXACTAMENTE lo que `modalidad_competitiva` deja entrar al corpus:
       si aceptara de más, el índice agruparía procesos que la ingesta nunca
       guardó; si de menos, procesos legítimos caerían en `sin_modalidad` y su
       baja se perdería. Dos listas de «qué es competitivo» divergen a la primera
       corrección que se aplique a una sola. */
    {
      const { modalidad_competitiva } = require("../lib/filtros.js");
      const CASOS = [
        "Licitación pública", "LICITACION PUBLICA", "Selección abreviada",
        "Selección abreviada de menor cuantía", "Subasta inversa", "Concurso de méritos",
        "Mínima cuantía", "Acuerdo marco de precios",
        "Contratación régimen especial (con ofertas)",   // competitiva por su propia rama
        "Contratación directa", "Contratación régimen especial", "Invitación Privada",
        "Licitación privada", "Enajenación de bienes con Subasta", "",
      ];
      for (const m of CASOS) {
        const lic = { modalidad_de_contratacion: m };
        assert.strictEqual(
          indiceBaja.modalidadCanonica(lic) !== null, modalidad_competitiva(lic),
          `«${m}»: la cubeta y la lista blanca de la ingesta discrepan — una de las dos está mintiendo`,
        );
      }
      // y «Enajenación… con Subasta» no puede acabar en la cubeta «subasta»
      assert.strictEqual(indiceBaja.modalidadCanonica({ modalidad_de_contratacion: "Enajenación de bienes con Subasta" }), null,
        "la enajenación trae la palabra «subasta» y tiene que caer ANTES de que la lista blanca la vea");
      assert.ok(indiceBaja.modalidadesConocidas().includes(indiceBaja.REGIMEN_ESPECIAL),
        "el régimen especial con ofertas es competitivo: sin cubeta, sus procesos perderían su baja");
    }

    /* El módulo importa `filtros` de forma DIFERIDA y no cierra ciclo, igual que
       lib/apu/inferencia. Se comprueba sobre el grafo real, no de palabra. */
    {
      const fsMod = require("fs"), pathMod = require("path");
      const raiz = pathMod.join(__dirname, "..");
      const deps = (rel) => [...fsMod.readFileSync(pathMod.join(raiz, rel), "utf8")
        .matchAll(/require\("(\.[^"]+)"\)/g)]
        .map((m) => pathMod.normalize(pathMod.join(pathMod.dirname(rel), m[1])));
      const visto = new Set(); const pila = ["lib/filtros.js"];
      while (pila.length) {
        const f = pila.pop();
        if (visto.has(f) || !f.endsWith(".js")) continue;
        visto.add(f);
        try { for (const d of deps(f)) pila.push(d); } catch { /* no es un módulo del repo */ }
      }
      assert.ok(!visto.has("lib/indice_baja.js"),
        "la cadena de `filtros` no puede alcanzar `indice_baja`: sería un ciclo de requires");
      const fuenteBaja = fs.readFileSync(pathMod.join(raiz, "lib", "indice_baja.js"), "utf8");
      const cabecera = fuenteBaja.slice(0, fuenteBaja.indexOf("function tablaModalidades"));
      assert.ok(!/require\("\.\/filtros\.js"\)/.test(cabecera),
        "el require de filtros va DIFERIDO dentro de la función, igual que en lib/apu/inferencia");
    }

    console.log("· unidad índice de baja: 3 granularidades en cascada, filtros de lote parcial y dato malo, "
      + "el cero como dato, el ajuste de P(ganar) y la baja POR MODALIDAD (cubetas que suman, "
      + "mínimo respetado y degradación al hash sin `por_modalidad`)");
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

  /* ══════════════════════════════════════════════════════════════════════════
     UNIDAD · APU: parseo de la tabla de cantidades de un pliego
     ──────────────────────────────────────────────────────────────────────────
     Todo lo de este bloque es FUNCIÓN PURA sobre texto sintético: ni Redis, ni
     Socrata, ni red. El endpoint /api/apu/extraer-texto también entra aquí
     porque tampoco toca Redis — es una función sobre el cuerpo de la petición.
     ══════════════════════════════════════════════════════════════════════════ */
  {
    const pliego = require("../lib/apu_pliego.js");
    const mapeo = require("../lib/apu_mapeo.js");
    const cat = require("../lib/apu_catalogo.js");
    const ocrMod = require("../lib/apu_ocr.js");
    const apiExtraer = require("../lib/apu_extraer.js");
    const apiDescargar = require("../lib/apu_descargar.js");
    const TAB = "\t";

    /* 1. NÚMEROS EN FORMATO COLOMBIANO. Punto de miles, coma decimal.
       Invertirlo multiplica por 1000, que es el error silencioso más caro de
       todo el módulo, así que la tabla es explícita caso por caso. */
    {
      const casos = [
        ["1.234.567,89", 1234567.89], ["1.234.567", 1234567], ["1.234", 1234],
        ["1.5", 1.5], ["1.50", 1.5], ["12,5", 12.5], ["0,00", 0], ["$ 45.000", 45000],
        ["1.234.56", 1234.56], ["-500", -500], ["  8.450,00  ", 8450],
        // lo que NO es un número: el nº del contrato, texto, comas dobles
        ["2024-350", null], ["abc", null], ["1,2,3", null], ["", null], ["CM-001", null],
      ];
      for (const [entrada, esperado] of casos) {
        assert.strictEqual(pliego.numeroColombiano(entrada), esperado,
          `numeroColombiano(${JSON.stringify(entrada)}) debía dar ${esperado}`);
      }
    }

    /* 2. UNIDADES: la celda tiene que SER una unidad, no contenerla. Si valiera
       «contiene», «SUMINISTRO» casaría con «un» y toda línea de prosa pasaría
       por fila de ítem. */
    {
      const eq = [["M3", "m3"], ["m³", "m3"], ["UND", "un"], ["GLB", "gl"],
        ["METRO CUADRADO", "m2"], ["ML", "ml"], ["Kgs", "kg"], ["  M2 ", "m2"], ["TONELADAS", "ton"]];
      for (const [entrada, esperado] of eq) {
        assert.strictEqual(pliego.unidadCanonica(entrada), esperado, `unidadCanonica(${entrada})`);
      }
      for (const no of ["SUMINISTRO", "CONCRETO DE 21 MPA", "", "xyz", "unidades sanitarias"]) {
        assert.strictEqual(pliego.unidadCanonica(no), null, `«${no}» no es una unidad`);
      }
    }

    /* 3. CABECERAS: ≥3 grupos en una fila la convierten en cabecera, y gana la
       coincidencia más ESPECÍFICA («CANTIDAD TOTAL» es cantidad, no total). */
    {
      const g = pliego.grupoDeCabecera;
      assert.strictEqual(g("ÍTEM"), "item");
      assert.strictEqual(g("DESCRIPCIÓN"), "descripcion");
      assert.strictEqual(g("VR UNITARIO"), "unitario");
      assert.strictEqual(g("VALOR TOTAL"), "total");
      assert.strictEqual(g("CANTIDAD TOTAL"), "cantidad", "gana el patrón más largo, no el primero de la lista");
      // los formularios abrevian con puntos de forma inconsistente: las tres formas
      assert.deepStrictEqual([g("U.M."), g("U M"), g("UM")], ["unidad", "unidad", "unidad"]);
      assert.strictEqual(g("SUBBASE GRANULAR"), null, "una descripción no es una cabecera");
    }

    /* 4. PARSEO POSICIONAL sobre un formulario completo: cabecera, capítulos con
       su subtotal, filas con precio, AIU declarado y anticipo. */
    const FORMULARIO = [
      "MUNICIPIO DE PURIFICACION - TOLIMA",
      "FORMULARIO 1 - PRESUPUESTO OFICIAL",
      "",
      ["ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO", "VALOR TOTAL"].join(TAB),
      ["1", "PRELIMINARES"].join(TAB),
      ["1.1", "LOCALIZACION Y REPLANTEO", "M2", "1.250,00", "2.500", "3.125.000"].join(TAB),
      ["1.2", "DESCAPOTE Y LIMPIEZA", "M2", "1.250,00", "3.200", "4.000.000"].join(TAB),
      ["", "SUBTOTAL CAPITULO 1", "", "", "", "7.125.000"].join(TAB),
      ["2", "ESTRUCTURA DE PAVIMENTO"].join(TAB),
      ["2.1", "SUBBASE GRANULAR COMPACTADA", "M3", "375,00", "95.000", "35.625.000"].join(TAB),
      ["2.2", "CONCRETO DE 21 MPA (3000 PSI) PARA HUELLAS", "M3", "180,50", "620.000", "111.910.000"].join(TAB),
      ["2.3", "ACERO DE REFUERZO FIGURADO FY=420 MPA", "KG", "8.450,00", "6.800", "57.460.000"].join(TAB),
      ["", "SUBTOTAL CAPITULO 2", "", "", "", "204.995.000"].join(TAB),
      "",
      "ADMINISTRACION A: 15%", "IMPREVISTOS I: 3%", "UTILIDAD U: 5%",
      "ANTICIPO: 30%",
      "Pagina 1 de 3",
    ].join("\n");
    {
      const r = pliego.parsearPliego(FORMULARIO, { precio_base: 262124860 });
      assert.strictEqual(r.items.length, 5, `esperaba 5 ítems, llegaron ${r.items.length}`);
      assert.ok(r.items.every((i) => i.via === "posicional"), "con cabecera todas las filas van por posición");
      assert.strictEqual(r.items[3].cantidad, 180.5, "«180,50» es ciento ochenta y medio, no 18050");
      assert.strictEqual(r.items[3].total_oficial, 111910000);
      assert.strictEqual(r.items[3].capitulo.numeral, "2", "la fila cuelga del capítulo vigente");
      assert.deepStrictEqual(r.capitulos.map((c) => c.numeral), ["1", "2"]);
      assert.strictEqual(r.capitulos[0].subtotal_declarado, 7125000);
      assert.ok(r.validacion.capitulos.every((c) => c.estado === "cuadra"), "los dos capítulos deben cuadrar");
      assert.strictEqual(r.validacion.filas.cuadran, 5, "las cinco filas cuadran: cantidad × unitario = total");

      /* EL DEFECTO DE «ANTICIPO: 30%» PEGADO A LA ÚLTIMA DESCRIPCIÓN.
         La regla de «continuación de una descripción partida en dos líneas» se
         llevaba las líneas de metadato y le inventaba al último ítem una
         descripción que no está en el pliego. Una línea que tiene su propio
         lector no es prosa suelta. */
      assert.strictEqual(r.items[4].descripcion_original, "ACERO DE REFUERZO FIGURADO FY=420 MPA",
        "una línea de metadato (AIU, anticipo) no puede acabar dentro de la descripción de un ítem");
      assert.ok(r.diagnostico.descartadas.metadatos >= 4,
        "las líneas de AIU y anticipo se cuentan como metadatos, no como «no reconocidas»");

      // AIU declarado y anticipo, leídos del texto
      assert.strictEqual(r.aiu_declarado.A, 0.15);
      assert.strictEqual(Math.round(r.aiu_declarado.total * 100) / 100, 0.23);
      assert.strictEqual(r.anticipo.anticipo_pct, 0.3);
      assert.strictEqual(r.anticipo.pago_anticipado_pct, null, "el formulario no declara pago anticipado");
      /* Con una mitad ausente, el veredicto del tope legal es `null` —«no sé»—, no
         `false`. Un 30 % de anticipo NO permite afirmar que la suma no excede el
         50 %: el pago anticipado podría ser un 25 %. Antes se sumaba con `|| 0` y
         se publicaba `false`, que es afirmar algo que no se sabe. */
      assert.strictEqual(r.anticipo.excede_tope_legal, null,
        "con el pago anticipado sin leer, el tope legal no se puede afirmar ni negar");
      assert.strictEqual(r.anticipo.completo, false);
      assert.strictEqual(r.anticipo.suma_conocida, 0.3, "la suma publicada es la de lo CONOCIDO, y se llama así");

      /* NIVEL DOCUMENTO: el IVA sobre la utilidad NO es un detalle. Con U = 5 %
         el presupuesto se divide por (1+0,23+0,19·0,05) y esa es la variante que
         cuadra; ignorar `t·U` haría fallar el chequeo de forma sistemática. */
      assert.strictEqual(r.validacion.documento.estado, "cuadra");
      assert.strictEqual(r.validacion.documento.via, "aiu_declarado");
      assert.strictEqual(r.validacion.documento.variante_que_cuadro, "con_iva",
        "la variante que cuadra tiene que quedar registrada: es información sobre cómo presupuesta la entidad");
      assert.strictEqual(r.confianza.color, "verde", "5/5 filas y el total con AIU declarado: verde");
    }

    /* 5. SIN CABECERA → firma de unidad. «Una celda que es exactamente una de
       estas es la señal más barata y fiable de que la fila es un ítem». */
    {
      const r = pliego.parsearPliego([
        ["EXCAVACION MANUAL EN MATERIAL COMUN", "M3", "420,00"].join(TAB),
        ["RELLENO COMPACTADO CON MATERIAL SELECCIONADO", "M3", "380,50"].join(TAB),
      ].join("\n"));
      assert.strictEqual(r.items.length, 2);
      assert.ok(r.items.every((i) => i.via === "firma_unidad"));
      assert.strictEqual(r.items[0].cantidad, 420, "con un solo número a la derecha, ese número es la CANTIDAD");
      assert.strictEqual(r.items[0].unitario_oficial, null, "…y no un precio: suponerlo dejaría el ítem sin cantidad");
      /* CANTIDADES SIN PRECIOS es el caso «frecuente y benigno»: no hay
         aritmética que validar, así que ni rojo (sigue siendo la mayor parte del
         valor) ni verde (verde significa «se usa automáticamente»). */
      assert.strictEqual(r.confianza.color, "amarillo");
      assert.strictEqual(r.confianza.motivo, "sin_precios_unitarios");
    }

    /* 6. TEXTO APLANADO (un solo espacio entre celdas): último recurso, y se
       marca como tal para poder distinguirlo en el diagnóstico. */
    {
      const r = pliego.parsearPliego("1.1 SUMINISTRO E INSTALACION DE TUBERIA PVC ML 1.250,00 45.000 56.250.000");
      assert.strictEqual(r.items.length, 1);
      assert.strictEqual(r.items[0].via, "aplanada");
      assert.strictEqual(r.items[0].numeral, "1.1");
      assert.strictEqual(r.items[0].descripcion_original, "SUMINISTRO E INSTALACION DE TUBERIA PVC");
      assert.strictEqual(r.items[0].cantidad, 1250);
      assert.strictEqual(r.items[0].total_oficial, 56250000);
    }

    /* 6-bis. DOS LÍMITES QUE ENCONTRÓ tests/apu_bench.js Y QUE YA ESTÁN CERRADOS.
       Los dos producían lo mismo: un ítem que no existe en el pliego más una
       cantidad perdida, que es la peor combinación posible aquí. */
    {
      // (a) CELDAS COMBINADAS: la unidad se corre a la columna del precio y las
      // cifras quedan a la IZQUIERDA. Sin el rescate, la descripción se comía la
      // cantidad («ANDEN EN CONCRETO 640,00») y `cantidad` salía null.
      const combinada = pliego.parsearPliego([
        ["ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO"].join(TAB),
        ["1", "ANDEN EN CONCRETO", "", "640,00", "M2"].join(TAB),
      ].join("\n"));
      assert.strictEqual(combinada.items.length, 1);
      assert.strictEqual(combinada.items[0].descripcion_original, "ANDEN EN CONCRETO",
        "una celda numérica suelta no forma parte de la descripción");
      assert.strictEqual(combinada.items[0].cantidad, 640);
      assert.strictEqual(combinada.items[0].unidad, "m2");

      // (b) APLANADO con una unidad MENCIONADA dentro de la descripción: se elige
      // la ÚLTIMA palabra-unidad SEGUIDA DE UN NÚMERO, porque en un formulario la
      // unidad va delante de la cantidad. Con la primera, «…DE 50 M3 EN CONCRETO
      // UND 2,00» devolvía «TANQUE DE ALMACENAMIENTO DE 50» medido en m3.
      const dentro = pliego.parsearPliego(
        "1.1 TANQUE DE ALMACENAMIENTO DE 50 M3 EN CONCRETO UND 2,00 45.000.000 90.000.000");
      assert.strictEqual(dentro.items.length, 1);
      assert.strictEqual(dentro.items[0].descripcion_original, "TANQUE DE ALMACENAMIENTO DE 50 M3 EN CONCRETO");
      assert.strictEqual(dentro.items[0].unidad, "un", "la unidad de pago es UND, no el «M3» del texto");
      assert.strictEqual(dentro.items[0].cantidad, 2);
    }

    /* 6-ter. SIETE DEFECTOS QUE PRODUCÍAN UNA CIFRA EQUIVOCADA Y CREÍBLE, que es
       lo peor que este módulo puede hacer. Los siete reproducidos antes de
       corregirlos; esta batería es su cerradura. */
    {
      // (a) UNA CELDA VACÍA descolocaba TODO el mapa de columnas: `dividirCeldas`
      //     filtraba los huecos y `cantidad` acababa leyendo el PRECIO UNITARIO.
      const hueco = pliego.parsearPliego([
        ["ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO", "VALOR TOTAL"].join(TAB),
        ["2.1", "SUBBASE GRANULAR", "M3", "", "95.000", "35.625.000"].join(TAB),
      ].join("\n"));
      assert.strictEqual(hueco.items.length, 1);
      assert.strictEqual(hueco.items[0].cantidad, null, "la cantidad está en blanco: es «sin dato», no el unitario");
      assert.strictEqual(hueco.items[0].unitario_oficial, 95000, "y el unitario sigue en su columna");

      // (b) LA CANTIDAD ES LA CIFRA ADYACENTE A LA UNIDAD. Con el orden
      //     CANTIDAD|UNIDAD y sin cabecera se leía el unitario como cantidad.
      const izq = pliego.parsearPliego(
        ["1.1", "SUBBASE GRANULAR COMPACTADA", "375,00", "M3", "95.000", "35.625.000"].join(TAB));
      assert.strictEqual(izq.items[0].cantidad, 375, "375 m³, no 95.000");
      assert.strictEqual(izq.items[0].unitario_oficial, 95000);

      // (c) EL AIU Y EL IVA DESGLOSADOS no son costo directo: entraban en la suma
      //     del documento e inflaban el costo directo.
      const conAiu = pliego.parsearPliego([
        ["ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO", "VALOR TOTAL"].join(TAB),
        ["1", "CONCRETO ESTRUCTURAL", "M3", "10", "1.000.000", "10.000.000"].join(TAB),
        ["", "ADMINISTRACION 15%", "GL", "1,00", "1.500.000", "1.500.000"].join(TAB),
        ["", "IVA SOBRE UTILIDAD", "GL", "1,00", "95.000", "95.000"].join(TAB),
      ].join("\n"));
      assert.strictEqual(conAiu.items.length, 1, "solo el concreto es costo directo");
      assert.strictEqual(conAiu.diagnostico.descartadas.no_costo_directo, 2);
      assert.strictEqual(conAiu.validacion.documento.costo_directo_sumado, 10000000,
        "el AIU desglosado no puede sumarse al costo directo");

      // (d) LA PROSA NO ES UNA FILA. La vía aplanada convertía frases en ítems
      //     con unidad y cantidad inventadas — y es la vía normal del OCR.
      for (const frase of [
        "SE PAGARA POR ML 1.000 METROS DE TUBERIA INSTALADA",
        "LA VIA A INTERVENIR TIENE UNA LONGITUD DE 1.000 M APROXIMADAMENTE",
      ]) {
        assert.strictEqual(pliego.parsearPliego(frase).items.length, 0,
          `«${frase}» no es una fila de ítem: no puede producir uno`);
      }

      // (e) CABECERA PARTIDA EN DOS LÍNEAS («VALOR|VALOR» + «UNITARIO|TOTAL»):
      //     los dos mapeaban a `total` y ganaba el primero, así que `total`
      //     quedaba anclado a la columna del precio unitario.
      const partida = pliego.parsearPliego([
        ["ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR", "VALOR"].join(TAB),
        ["UNITARIO", "TOTAL"].join(TAB),
        ["1.1", "SUBBASE", "M3", "375,00", "95.000", "35.625.000"].join(TAB),
      ].join("\n"));
      assert.strictEqual(partida.items[0].unitario_oficial, 95000);
      assert.strictEqual(partida.items[0].total_oficial, 35625000);

      // (f) DOS CAPÍTULOS CON EL MISMO NUMERAL (dos grupos que reinician la
      //     numeración) sumaban sus hijas juntas y los dos salían «no_cuadra».
      const dosGrupos = pliego.parsearPliego([
        ["ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO", "VALOR TOTAL"].join(TAB),
        ["1", "PRELIMINARES"].join(TAB),
        ["1.1", "UNO", "M3", "10", "10.000", "100.000"].join(TAB),
        ["", "TOTAL CAPITULO 1", "", "", "", "100.000"].join(TAB),
        ["1", "SEGUNDO GRUPO"].join(TAB),
        ["1.1", "DOS", "M3", "20", "10.000", "200.000"].join(TAB),
        ["", "TOTAL CAPITULO 1", "", "", "", "200.000"].join(TAB),
      ].join("\n"));
      assert.strictEqual(dosGrupos.validacion.capitulos.length, 2);
      assert.ok(dosGrupos.validacion.capitulos.every((c) => c.estado === "cuadra"),
        `dos capítulos «1» distintos no pueden sumar sus hijas juntas: ${JSON.stringify(dosGrupos.validacion.capitulos.map((c) => c.estado))}`);

      // (g) «HOJALATA» se descartaba como pie de página porque «hoja» hacía
      //     prefijo sin frontera de palabra.
      assert.strictEqual(pliego.parsearPliego(["HOJALATA CALIBRE 26 PARA CANAL", "ML", "120,00"].join(TAB)).items.length, 1,
        "«HOJALATA» no es un pie de página");

      /* Y el reparto del diagnóstico SUMA: cada línea acaba en una cubeta. Sin
         esto, las líneas de continuación hacían `continue` sin contarse y los
         conteos dejaban de cuadrar con `lineas_leidas`. */
      const suma = Object.values(conAiu.diagnostico.descartadas).reduce((a, b) => a + b, 0)
        + conAiu.items.length + conAiu.capitulos.length;
      assert.strictEqual(suma, conAiu.diagnostico.lineas_leidas,
        `el reparto del diagnóstico no suma las líneas leídas: ${suma} vs ${conAiu.diagnostico.lineas_leidas}`);
    }

    /* 6-quater. EL SEMÁFORO NO PUEDE DAR VERDE SOBRE UNA LISTA A MEDIAS.
       Las filas sin cantidad legible no entran en el denominador del ratio (no hay
       aritmética que hacer), así que por sí solas no bajaban la confianza: se
       llegaba a VERDE con la mayoría de las cantidades sin leer — y el aviso «N
       ítem(s) quedaron SIN CANTIDAD legible» salía en la MISMA respuesta,
       contradiciendo a la insignia. */
    {
      const cab = ["ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VR UNITARIO", "VR TOTAL"].join(TAB);
      const conIlegibles = pliego.parsearPliego([
        cab,
        ["1", "EXCAVACION MANUAL", "M3", "100,00", "10.000", "1.000.000"].join(TAB),
        ["2", "RELLENO COMPACTADO", "M3", "50,00", "20.000", "1.000.000"].join(TAB),
        ["3", "CONCRETO PARA ANDENES", "M2", "ILEGIBLE", "5.000", "1.000.000"].join(TAB),
        ["4", "SUB BASE GRANULAR", "M3", "-", "5.000", "1.000.000"].join(TAB),
        ["5", "TUBERIA PVC INSTALADA", "ML", "N/A", "5.000", "1.000.000"].join(TAB),
        "ADMINISTRACION A: 15%", "IMPREVISTOS I: 3%", "UTILIDAD U: 5%",
      ].join("\n"), { precio_base: 5000000 * (1 + 0.23 + 0.19 * 0.05) });
      assert.strictEqual(conIlegibles.diagnostico.items_sin_cantidad, 3);
      assert.notStrictEqual(conIlegibles.confianza.color, "verde",
        "con 3 de 5 cantidades ilegibles NO puede haber verde: verde significa «se usa automáticamente»");
      assert.strictEqual(conIlegibles.confianza.motivo, "cantidades_ilegibles");

      // y el verde exige MUESTRA: «1 de 1 cuadra» daba 100 % y verde
      const unaSola = pliego.parsearPliego([
        cab, ["1", "CONCRETO ESTRUCTURAL", "M3", "10", "1.000.000", "10.000.000"].join(TAB),
        "ADMINISTRACION A: 15%", "IMPREVISTOS I: 3%", "UTILIDAD U: 5%",
      ].join("\n"), { precio_base: 10000000 * (1 + 0.23 + 0.19 * 0.05) });
      assert.strictEqual(unaSola.confianza.motivo, "muestra_insuficiente",
        "un verde apoyado en una sola fila no es una validación");

      // con muestra suficiente y todo legible, sí es verde
      const seis = [];
      for (let i = 1; i <= 6; i++) seis.push([`1.${i}`, `ITEM ${i}`, "M3", "10", "1.000.000", "10.000.000"].join(TAB));
      const bueno = pliego.parsearPliego([cab, ...seis,
        "ADMINISTRACION A: 15%", "IMPREVISTOS I: 3%", "UTILIDAD U: 5%",
      ].join("\n"), { precio_base: 60000000 * (1 + 0.23 + 0.19 * 0.05) });
      assert.strictEqual(bueno.confianza.color, "verde", JSON.stringify(bueno.confianza));
      assert.ok(pliego.MIN_FILAS_VERDE >= 5, "el mínimo de muestra para el verde no puede bajar de 5");
    }

    /* 7. UNA CANTIDAD ILEGIBLE ES `null`, JAMÁS 0. Es la misma regla que
       `anticipo_pct = 0` = «sin dato» y que el contador de oferentes; aquí un
       cero inventado en una cantidad de obra es plata. */
    {
      const r = pliego.parsearPliego([
        ["ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD"].join(TAB),
        ["1.1", "CONCRETO ESTRUCTURAL", "M3", "ILEGIBLE"].join(TAB),
      ].join("\n"));
      assert.strictEqual(r.items.length, 1, "la fila NO se descarta por tener la cantidad ilegible");
      assert.strictEqual(r.items[0].cantidad, null, "una cantidad ilegible es null, no 0");
      assert.strictEqual(r.diagnostico.items_sin_cantidad, 1);
    }

    /* 8. TOLERANCIAS: derivadas de la FUENTE del error, no de un porcentaje del
       total. El error por redondear el unitario al peso es cantidad × 0,5. */
    {
      assert.strictEqual(pliego.toleranciaFila(40000), 20001, "cantidad/2 + 1");
      assert.strictEqual(pliego.toleranciaFila(0), 1, "el suelo es $1: nunca 0");
      // una fila de 500 M con un dígito mal leído debe caer, y con un
      // porcentaje del total (0,5 % = $2,5 M) no caería
      const fila = { cantidad: 1, unitario_oficial: 500000000, total_oficial: 502000000 };
      assert.strictEqual(pliego.validarFila(fila).estado, "no_cuadra",
        "$2 M de desviación en una fila de cantidad 1 tiene que caer");
      assert.strictEqual(pliego.validarFila({ cantidad: 100, unitario_oficial: 1000, total_oficial: 100000 }).estado, "cuadra");
      assert.strictEqual(pliego.validarFila({ cantidad: 100, unitario_oficial: null, total_oficial: 1 }).estado, "sin_datos");
    }

    /* 9. EL BARRIDO DIAGNÓSTICO NUNCA PRODUCE VERDE. Con 25 puntos de parámetro
       libre casi cualquier suma encuentra un AIU que «cuadra», incluidas las
       tablas incompletas que este nivel debía cazar. */
    {
      const sinAiu = FORMULARIO.split("\n").filter((l) => !/ADMINISTRACION|IMPREVISTOS|UTILIDAD/.test(l)).join("\n");
      const r = pliego.parsearPliego(sinAiu, { precio_base: 262124860 });
      assert.strictEqual(r.validacion.documento.estado, "diagnostico");
      assert.strictEqual(r.validacion.documento.via, "barrido");
      assert.notStrictEqual(r.confianza.color, "verde",
        "sin AIU declarado no puede haber verde, por bien que cuadren las filas");
      assert.strictEqual(r.confianza.color, "amarillo");
      assert.strictEqual(r.confianza.motivo, "total_no_cuadra");
    }

    /* 10. SEMÁFORO: matriz de DOS EJES, exhaustiva y sin huecos. */
    {
      const s = (filasConPrecio, filasCuadran, totalCuadraDeclarado) =>
        pliego.semaforo({ filasConPrecio, filasCuadran, totalCuadraDeclarado }).color;
      assert.strictEqual(s(100, 100, true), "verde");
      assert.strictEqual(s(100, 100, false), "amarillo", "filas perfectas pero total sin cuadrar: amarillo");
      assert.strictEqual(s(100, 95, true), "amarillo", "90-98 % es amarillo aunque el total cuadre");
      assert.strictEqual(s(100, 95, false), "amarillo");
      assert.strictEqual(s(100, 89, true), "rojo", "<90 % descarta el parseo entero");
      assert.strictEqual(s(100, 89, false), "rojo");
      assert.strictEqual(s(100, 98, true), "verde", "el corte del 98 % ENTRA");
      assert.strictEqual(s(100, 90, true), "amarillo", "el corte del 90 % ENTRA (no es rojo)");
      assert.strictEqual(s(0, 0, false), "amarillo", "sin precios: ni rojo ni verde");
    }

    /* 11. ANTICIPO + PAGO ANTICIPADO ≤ 50 %: si el parseo produce más, el parseo
       está mal, no el pliego (tope del parágrafo del art. 40 de la Ley 80). Y son
       DOS campos distintos: el anticipo se amortiza, el pago anticipado ingresa. */
    {
      const a = pliego.leerAnticipo(["ANTICIPO: 40%", "PAGO ANTICIPADO: 20%"]);
      assert.strictEqual(a.anticipo_pct, 0.4);
      assert.strictEqual(a.pago_anticipado_pct, 0.2);
      assert.strictEqual(a.excede_tope_legal, true, "40 % + 20 % = 60 % supera el tope legal del 50 %");
      const b = pliego.leerAnticipo(["ANTICIPO DEL 30%", "PAGO ANTICIPADO: 20%"]);
      assert.strictEqual(b.excede_tope_legal, false, "30 % + 20 % = 50 % justo: no excede");
      assert.strictEqual(pliego.leerAnticipo(["nada que ver"]), null);

      /* CUATRO DEFECTOS DEL LECTOR, los cuatro medidos, los cuatro cerrados. Los
         tres primeros publicaban un porcentaje que el pliego no dice. */
      // (a) el % se busca junto a SU palabra, no al principio de la línea
      assert.strictEqual(pliego.leerAnticipo(["EL AIU SERA DEL 25% Y EL ANTICIPO DEL 30%"]).anticipo_pct, 0.3,
        "tomar el primer % de la línea confundía el AIU con el anticipo");
      // (b) los dos conceptos en UNA línea son dos campos, no uno
      const juntos = pliego.leerAnticipo(["ANTICIPO: 30%   PAGO ANTICIPADO: 10%"]);
      assert.strictEqual(juntos.anticipo_pct, 0.3);
      assert.strictEqual(juntos.pago_anticipado_pct, 0.1,
        "con los dos conceptos en la misma línea, antes se perdía uno y el otro se llevaba su valor");
      // (c) la ventana NO cruza el punto: son frases distintas
      assert.strictEqual(pliego.leerAnticipo(["NO SE PACTARA ANTICIPO. LA RETENCION EN GARANTIA SERA DEL 5%"]), null,
        "un pliego que dice que NO hay anticipo no puede acabar declarando un 5 %");
      // (d) tres cifras: con `\\d{1,2}` el motor capturaba «00» y publicaba 0 %,
      //     que en este proyecto significa «sin dato»
      const cien = pliego.leerAnticipo(["ANTICIPO: 100%"]);
      assert.strictEqual(cien.anticipo_pct, 1, "«100%» no puede leerse como 0 %");
      assert.strictEqual(cien.excede_tope_legal, true);

      /* Y las dos correcciones del AIU, por el mismo motivo: fabricaban un AIU. */
      assert.strictEqual(pliego.leerAiu(["IMPREVISTOS EQUIVALENTES A 3% Y UTILIDAD A 5%"]), null,
        "la «a» de preposición no puede fijar la Administración del AIU");
      const abreviado = pliego.leerAiu(["A: 12%  I: 3%  U: 5%"]);
      assert.ok(abreviado && abreviado.A === 0.12 && abreviado.I === 0.03 && abreviado.U === 0.05,
        "la forma abreviada que la cabecera del módulo anuncia tiene que leerse de verdad");
    }

    /* 12. EL CATÁLOGO NO PUBLICA NINGÚN CÓDIGO «INV-». §1.D.3: «nunca inventar
       un código INV que no exista». El índice oficial de las Especificaciones
       INVÍAS nunca se pudo abrir, así que la numeración es una hipótesis y viaja
       aparte. Esta prueba es la cerradura de esa regla. */
    {
      assert.ok(cat.ITEMS.length >= 60, `el catálogo tiene ${cat.ITEMS.length} ítems: muy pocos`);
      for (const it of cat.ITEMS) {
        assert.ok(/^LOC-/.test(it.codigo_item),
          `${it.codigo_item}: todo código del catálogo debe nacer «LOC-» mientras el artículo INVÍAS no esté verificado`);
        assert.ok(pliego.UNIDADES_CANONICAS.has(it.unidad),
          `${it.codigo_item}: la unidad «${it.unidad}» no está en el conjunto canónico`);
        assert.ok(it.tipologias.length && it.tipologias.every((t) => cat.TIPOLOGIAS[t]),
          `${it.codigo_item}: tipología inexistente en el catálogo cerrado`);
        assert.ok(it.sinonimos.length, `${it.codigo_item}: sin sinónimos no se puede mapear nada`);
      }
      assert.strictEqual(Object.keys(cat.TIPOLOGIAS).length, 22, "el catálogo de tipologías es CERRADO: 22");
      // las familias 5510 y 7213 no están en ningún RUP: citarlas aquí las
      // convertiría en evidencia de habilitación, que es justo lo que no son
      const familias = new Set(Object.values(cat.TIPOLOGIAS).flatMap((t) => t.familias));
      assert.ok(!familias.has("5510") && !familias.has("7213"),
        "5510 y 7213 no están inscritas en ningún RUP: no pueden figurar en el catálogo de tipologías");
      // el código INV que se emitiría queda PREPARADO pero marcado sin verificar
      const conArticulo = cat.ITEMS.find((i) => i.articulo_invias_candidato);
      const propuesto = cat.codigoInviasPropuesto(conArticulo);
      assert.ok(/^INV-/.test(propuesto.codigo) && propuesto.verificado === false,
        "el código INVÍAS propuesto tiene que viajar marcado como NO verificado");
    }

    /* 13. TOKENIZACIÓN DEL MAPEO: CONSERVA LOS DÍGITOS, al revés que
       `experiencia.tokenizar`, que los descarta a propósito. Aquí «21» (MPa),
       «420» (fy) y «21» (RDE) son justo lo que distingue un ítem de su hermano y
       lo que mueve el precio. Son dos preguntas distintas y por eso hay dos
       reglas; esta prueba existe para que nadie las «unifique». */
    {
      const exp2 = require("../lib/experiencia.js");
      const conDigitos = mapeo.tokenizarItem("CONCRETO DE 21 MPA PARA HUELLAS");
      assert.ok(conDigitos.includes("21"), `el mapeo de ítems debe conservar «21»: ${JSON.stringify(conDigitos)}`);
      assert.ok(!exp2.tokenizar("CONCRETO DE 21 MPA PARA HUELLAS").includes("21"),
        "experiencia.tokenizar SIGUE descartando los dígitos: son dos reglas distintas a propósito");
      // los verbos de ejecución están en casi todas las filas: no distinguen ninguna
      assert.ok(!mapeo.tokenizarItem("SUMINISTRO E INSTALACION DE TUBERIA").includes("suministro"));
      // una cifra de plata no es una especificación
      assert.ok(!mapeo.tokenizarItem("VALOR 56250000").includes("56250000"));
    }

    /* 14. MAPEO al catálogo: firme, revisar y personalizado. */
    {
      const r = pliego.parsearPliego([
        ["ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD"].join(TAB),
        ["1.1", "LOCALIZACION Y REPLANTEO", "M2", "1.250"].join(TAB),
        ["1.2", "ACERO DE REFUERZO FIGURADO FY=420 MPA", "KG", "8.450"].join(TAB),
        ["1.3", "SUMINISTRO E INSTALACION DE TUBERIA PVC RDE 21 DE 6 PULGADAS", "ML", "320"].join(TAB),
        ["1.4", "ALQUILER DE DRON PARA REGISTRO FOTOGRAFICO SEMANAL", "MES", "6"].join(TAB),
      ].join("\n"));
      const m = mapeo.mapearTabla(r.items, {
        objeto_proceso: "CONSTRUCCION DE PLACA HUELLA EN LA VIA TERCIARIA VEREDA EL PORVENIR",
        unspsc: ["72141000"],
      });
      assert.deepStrictEqual(m.tipologias_usadas, ["VIA-PH"], "el objeto es inequívocamente placa huella");
      assert.strictEqual(m.items[0].item_id, "LOC-PRE-LOCALIZACION");
      assert.strictEqual(m.items[0].nivel_mapeo, "firme");
      assert.strictEqual(m.items[1].item_id, "LOC-CON-ACERO");

      /* LA TIPOLOGÍA ES UN PESO, NO UN FILTRO. Cuando acotaba el catálogo, en un
         proceso de placa huella la fila del cruce de drenaje («TUBERÍA PVC»)
         caía a «personalizado» porque ese ítem no figura en VIA-PH. Un
         presupuesto de obra mezcla tipologías por construcción. */
      assert.strictEqual(m.items[2].item_id, "LOC-RED-TUBPVC",
        "un ítem de otra tipología tiene que poder mapearse: la tipología inclina, no veta");

      // sin match no se descarta la fila: nace un ítem PERSONALIZADO con sus datos
      assert.strictEqual(m.items[3].item_id, null);
      assert.strictEqual(m.items[3].personalizado, true);
      assert.strictEqual(m.items[3].descripcion_original, "ALQUILER DE DRON PARA REGISTRO FOTOGRAFICO SEMANAL");
      assert.strictEqual(m.items[3].unidad, "mes", "el personalizado conserva su unidad tal como venía");
      assert.strictEqual(m.items[3].cantidad, 6, "…y su cantidad");

      // el reparto tiene que SUMAR el total: si un ítem se quedara sin
      // categoría, desaparecería del recuento sin que nadie lo notara
      const s = m.resumen_mapeo;
      assert.strictEqual(s.firmes + s.revisar + s.personalizados, s.total,
        "firmes + revisar + personalizados debe sumar exactamente el total");
    }

    /* 15. LEVENSHTEIN RESCATA EL TEXTO DE OCR. Un reconocimiento cambia «O» por
       «0» y el solapamiento de términos falla ENTERO ante un carácter distinto;
       la distancia de edición apenas se mueve. Sin esta señal la vía de OCR no
       mapearía casi nada. */
    {
      assert.strictEqual(mapeo.levenshtein("concreto", "c0ncret0"), 2);
      assert.strictEqual(mapeo.levenshtein("igual", "igual"), 0);
      const m = mapeo.mapearItem({ descripcion_original: "C0NCRET0 DE 21 MPA PARA HUELLAS", unidad: "m3" },
        { tipologias: ["VIA-PH"] });
      assert.strictEqual(m.item_id, "LOC-CON-HUELLA",
        "con dos caracteres corrompidos por el OCR el ítem debe seguir mapeándose");
      assert.ok(m.confianza > mapeo.UMBRAL_ACEPTAR);
    }

    /* 16. LA UNIDAD NO SE CONVIERTE NUNCA: se marca la discrepancia y se
       conserva la DEL PLIEGO, que es la que se va a pagar. Pasar m² a m³ exige
       un espesor que el catálogo no conoce. */
    {
      const m = mapeo.mapearItem({ descripcion_original: "ACERO DE REFUERZO FIGURADO 420 MPA", unidad: "ton" }, {});
      assert.strictEqual(m.item_id, "LOC-CON-ACERO");
      assert.strictEqual(m.unidad, "ton", "se conserva la unidad del pliego");
      assert.strictEqual(m.unidad_catalogo, "kg");
      assert.strictEqual(m.unidad_discrepante, true);
    }

    /* 17. TIPOLOGÍA DEL OBJETO: léxico determinista con puntaje, y el UNSPSC
       como refuerzo suave que SUMA pero no veta (7215 y 7214 son compatibles con
       casi todo, así que vetar con ellos sería decidir por la evidencia débil). */
    {
      const t = cat.tipologiasProbables("MEJORAMIENTO DE VIA TERCIARIA MEDIANTE PLACA HUELLA", ["72141000"]);
      assert.strictEqual(t[0].tipologia, "VIA-PH");
      assert.ok(t[0].evidencia.includes("placa huella"), "la evidencia textual tiene que viajar con el puntaje");
      const conFamilia = cat.tipologiasProbables("CONSTRUCCION DE ALCANTARILLADO SANITARIO", ["72152000"]);
      const sinFamilia = cat.tipologiasProbables("CONSTRUCCION DE ALCANTARILLADO SANITARIO", []);
      assert.strictEqual(conFamilia[0].tipologia, "ALC-RED");
      assert.ok(conFamilia[0].puntaje > sinFamilia[0].puntaje, "la familia UNSPSC refuerza, no decide");
      assert.deepStrictEqual(cat.tipologiasProbables("COMPRA DE PAPELERIA Y UTILES DE OFICINA", []), [],
        "sin término ancla no se inventa una tipología: se puede decir «no sé»");
    }

    /* 18. OCR: sin `OCRSPACE_API_KEY` no se inventa nada — se dice qué falta y
       cómo se arregla. Igual que `HISTORICO_TOKEN` responde 503 cuando no está,
       nunca hay un default que valga como llave. */
    {
      assert.strictEqual(process.env.OCRSPACE_API_KEY, undefined, "la suite no debe traer clave de OCR configurada");
      assert.strictEqual(ocrMod.hayClaveOcr(), false);
      const r = await ocrMod.ocrPaginas([{ base64: "AAAA" }]);
      assert.strictEqual(r.ok, false);
      assert.strictEqual(r.status, 503);
      assert.ok(/OCRSPACE_API_KEY/.test(r.error), "el mensaje tiene que nombrar la variable que falta");
      // tamaño de un base64 sin materializar el Buffer
      assert.strictEqual(ocrMod.bytesDeBase64("AAAA"), 3);
      assert.strictEqual(ocrMod.bytesDeBase64("AAA="), 2);
      assert.ok(/^data:image\/jpeg;base64,/.test(ocrMod.conPrefijoData("AAAA")),
        "OCR.space exige el prefijo data:; sin él responde un error que no dice qué falta");

      /* LA CLAVE NO PUEDE VIAJAR EN UN MENSAJE DE ERROR. El cuerpo de error del
         proveedor se le muestra al usuario (es el único diagnóstico útil), pero lo
         escribe un tercero a partir de una petición que LLEVA la clave. */
      const claveAntes = process.env.OCRSPACE_API_KEY;
      process.env.OCRSPACE_API_KEY = "SUPERSECRETA-123";
      try {
        const tachado = ocrMod.tacharClave("Bad request for apikey=SUPERSECRETA-123 on this plan");
        assert.ok(!tachado.includes("SUPERSECRETA-123"),
          "el texto remoto reenviado al usuario debe llevar la clave tachada");
      } finally {
        if (claveAntes === undefined) delete process.env.OCRSPACE_API_KEY;
        else process.env.OCRSPACE_API_KEY = claveAntes;
      }

      /* Y LA RAMA `url` NO EXISTE: aceptar `{url}` y pasarlo a OCR.space hacía del
         endpoint un SSRF por delegación —el tercero descargaba lo que se le
         dijera— y además se saltaba el control de tamaño. */
      const fuenteOcr = sinComentarios(fs.readFileSync(path.join(__dirname, "..", "lib", "apu_ocr.js"), "utf8"));
      assert.ok(!/cuerpo\.set\("url"/.test(fuenteOcr),
        "lib/apu_ocr no puede mandar una `url` a OCR.space: sería un SSRF por delegación");
      const fuenteExtraer = sinComentarios(fs.readFileSync(path.join(__dirname, "..", "lib", "apu_extraer.js"), "utf8"));
      assert.ok(/base64: p\.base64/.test(fuenteExtraer),
        "el endpoint debe COPIAR solo base64 y mime, no pasar los objetos del cliente tal cual");
    }

    /* 18-bis. EL PROTOCOLO DE OCR.space, contra un `fetch` sustituido. Sin esto
       la integración entera quedaba sin probar salvo el caso «no hay clave», que
       es el único que no depende del proveedor. Lo que se vigila:
         · la `apikey` viaja por HEADER (es lo que exige su API), nunca en el cuerpo;
         · `base64Image` lleva el prefijo `data:`;
         · UN 200 NO ES ÉXITO: el fallo viaja DENTRO del 200
           (`IsErroredOnProcessing`, `OCRExitCode` 3/4) y sin comprobarlo se
           devolvería texto vacío como si la página no tuviera nada;
         · una página que excede el tope se rechaza ANTES de gastar la petición. */
    {
      const fetchOriginal = global.fetch;
      const claveOriginal = process.env.OCRSPACE_API_KEY;
      process.env.OCRSPACE_API_KEY = "clave-de-prueba";
      let capturada = null;
      const responder = (cuerpo, status = 200) => {
        global.fetch = async (url, opciones) => {
          capturada = { url, opciones };
          return {
            ok: status >= 200 && status < 300, status,
            headers: { get: () => null },
            json: async () => cuerpo,
            text: async () => JSON.stringify(cuerpo),
          };
        };
      };
      try {
        // (a) 200 con texto: el camino bueno, y el contrato de la petición
        responder({ OCRExitCode: 1, IsErroredOnProcessing: false, ParsedResults: [{ ParsedText: "1 CONCRETO M3 100" }] });
        const bueno = await ocrMod.ocrPagina({ base64: "QUJD", mime: "image/jpeg" });
        assert.strictEqual(bueno.ok, true);
        assert.strictEqual(bueno.texto, "1 CONCRETO M3 100");
        assert.strictEqual(capturada.opciones.headers.apikey, "clave-de-prueba",
          "la apikey de OCR.space va por HEADER: es lo que exige su API");
        assert.ok(!/apikey/.test(capturada.opciones.body), "la clave no puede viajar también en el cuerpo");
        assert.ok(/base64Image=data%3Aimage%2Fjpeg%3Bbase64%2CQUJD/.test(capturada.opciones.body),
          "base64Image debe llevar el prefijo data: URI-codificado");
        assert.ok(/isTable=true/.test(capturada.opciones.body) && /language=spa/.test(capturada.opciones.body),
          "isTable y el idioma español no son opcionales para leer una tabla de un pliego colombiano");

        // (b) UN 200 NO ES ÉXITO: el fallo viene dentro
        responder({ OCRExitCode: 3, IsErroredOnProcessing: true, ErrorMessage: ["Unable to recognize the file type"] });
        const dentro = await ocrMod.ocrPagina({ base64: "QUJD" });
        assert.strictEqual(dentro.ok, false, "IsErroredOnProcessing dentro de un 200 es un FALLO");
        assert.ok(/Unable to recognize/.test(dentro.error), "el detalle del proveedor tiene que llegar al usuario");

        // (c) 200 con texto vacío: tampoco es éxito
        responder({ OCRExitCode: 1, IsErroredOnProcessing: false, ParsedResults: [{ ParsedText: "   " }] });
        assert.strictEqual((await ocrMod.ocrPagina({ base64: "QUJD" })).ok, false,
          "una página sin texto reconocido no puede pasar por éxito");

        // (d) clave rechazada: mensaje que nombra la variable, y NO se reintenta
        responder({}, 401);
        let llamadas = 0;
        const contando = global.fetch;
        global.fetch = async (u, o) => { llamadas++; return contando(u, o); };
        const rechazada = await ocrMod.ocrPagina({ base64: "QUJD" });
        assert.strictEqual(rechazada.ok, false);
        assert.strictEqual(rechazada.status, 401);
        assert.strictEqual(llamadas, 1, "un 4xx NO se reintenta: repetirlo gasta cuota del plan gratuito");
        assert.ok(/OCRSPACE_API_KEY/.test(rechazada.error));

        // (e) la página que no cabe se rechaza ANTES de gastar la petición
        global.fetch = async () => { throw new Error("no debía llamarse"); };
        const grande = await ocrMod.ocrPagina({ base64: "A".repeat(2 * 1024 * 1024), mime: "image/jpeg" });
        assert.strictEqual(grande.ok, false);
        assert.strictEqual(grande.status, 413);
        assert.ok(/topa en/.test(grande.error), "el error debe decir el tope y qué hacer (bajar la escala)");
      } finally {
        // restaurar SIEMPRE: dejar un fetch sustituido rompería el resto de la suite
        global.fetch = fetchOriginal;
        if (claveOriginal === undefined) delete process.env.OCRSPACE_API_KEY;
        else process.env.OCRSPACE_API_KEY = claveOriginal;
      }
      assert.strictEqual(ocrMod.hayClaveOcr(), false, "la clave de prueba tiene que quedar retirada");
    }

    /* 19. EL ENDPOINT: token obligatorio, contrato por GET, y «sin tablas» es un
       RESULTADO (200 con diagnóstico), no un error del servidor. */
    {
      // sin token: 401, como el resto de la administración
      const sinToken = await invocar(apiExtraer, "/api/apu/extraer-texto");
      assert.strictEqual(sinToken.status, 401, "/api/apu/extraer-texto no puede servirse sin token");
      const sinTokenDesc = await invocar(apiDescargar, "/api/apu/descargar", {}, { metodo: "POST" });
      assert.strictEqual(sinTokenDesc.status, 401, "/api/apu/descargar tampoco");

      // GET: el contrato y el estado del catálogo y del OCR
      const contrato = await invocar(apiExtraer, "/api/apu/extraer-texto", CAB_TOKEN);
      assert.strictEqual(contrato.status, 200);
      assert.strictEqual(contrato.cuerpo.catalogo.tipologias, 22);
      assert.strictEqual(contrato.cuerpo.ocr.configurado, false);
      assert.ok(/puede tener errores/i.test(contrato.cuerpo.advertencia),
        "la advertencia de limitaciones viaja en el contrato del endpoint");

      // método no permitido
      const malMetodo = await invocar(apiExtraer, "/api/apu/extraer-texto", CAB_TOKEN, { metodo: "DELETE" });
      assert.strictEqual(malMetodo.status, 405);

      // POST completo
      const ok = await invocarPost(apiExtraer, "/api/apu/extraer-texto", {
        texto_extraido: FORMULARIO,
        objeto_proceso: "CONSTRUCCION DE PLACA HUELLA EN LA VIA TERCIARIA",
        unspsc: "72141000, 72152000",
        precio_base: 262124860,
      }, CAB_TOKEN);
      assert.strictEqual(ok.status, 200, JSON.stringify(ok.cuerpo).slice(0, 300));
      assert.strictEqual(ok.cuerpo.items.length, 5);
      assert.strictEqual(ok.cuerpo.confianza.color, "verde");
      assert.strictEqual(ok.cuerpo.fuente, "pdf_nativo");
      assert.ok(/puede tener errores/i.test(ok.cuerpo.advertencia),
        "la advertencia viaja SIEMPRE, también cuando el semáforo está verde");
      assert.strictEqual(ok.cabeceras["cache-control"], "no-store");

      // «sin tablas» → 200 con el diagnóstico: un 4xx haría creer que el envío
      // estaba mal cuando lo que pasa es que el documento no era el formulario
      const sinTabla = await invocarPost(apiExtraer, "/api/apu/extraer-texto", {
        texto_extraido: "EL PRESENTE PLIEGO DE CONDICIONES REGULA EL PROCESO DE SELECCION ABREVIADA "
          + "Y ESTABLECE LOS REQUISITOS HABILITANTES QUE DEBEN ACREDITAR LOS PROPONENTES INTERESADOS.",
      }, CAB_TOKEN);
      assert.strictEqual(sinTabla.status, 200);
      assert.strictEqual(sinTabla.cuerpo.ok, true);
      assert.deepStrictEqual(sinTabla.cuerpo.items, []);
      assert.strictEqual(sinTabla.cuerpo.confianza.color, "rojo");
      assert.ok(sinTabla.cuerpo.diagnostico, "sin filas hay que devolver el diagnóstico o no se puede corregir nada");

      // texto demasiado corto: 400 que EXPLICA la vía del OCR
      const corto = await invocarPost(apiExtraer, "/api/apu/extraer-texto", { texto_extraido: "hola" }, CAB_TOKEN);
      assert.strictEqual(corto.status, 400);
      assert.ok(/OCR/.test(corto.cuerpo.error), "el error tiene que señalar la salida (OCR) cuando no hay texto");

      // pedir OCR sin clave configurada: 503 con la instrucción, no un 500
      const pideOcr = await invocarPost(apiExtraer, "/api/apu/extraer-texto", {
        texto_extraido: "", imagenes_base64: [{ base64: "AAAA", mime: "image/jpeg" }],
      }, CAB_TOKEN);
      assert.strictEqual(pideOcr.status, 503);
      assert.ok(/OCRSPACE_API_KEY/.test(pideOcr.cuerpo.error));

      // cuerpo que no es JSON
      const basura = await invocar(apiExtraer, "/api/apu/extraer-texto", { ...CAB_TOKEN, "content-type": "application/json" },
        { metodo: "POST", body: "{no es json" });
      assert.strictEqual(basura.status, 400);
      assert.ok(/JSON/.test(basura.cuerpo.error));

      /* `solo_reconocer`: devuelve el texto SIN parsear para que el cliente pueda
         ENCADENAR tandas. Existe porque el tope de páginas por llamada viene del
         reloj de la función, así que un formulario escaneado de 40 páginas no cabe
         en una invocación; el cliente acumula y manda el texto completo al final.
         Parsear cada tanda por separado partiría la tabla y ni los capítulos ni la
         suma del documento cuadrarían. */
      {
        const fetchOriginal = global.fetch;
        const claveOriginal = process.env.OCRSPACE_API_KEY;
        process.env.OCRSPACE_API_KEY = "clave-de-prueba";
        global.fetch = async () => ({
          ok: true, status: 200, headers: { get: () => null },
          json: async () => ({
            OCRExitCode: 1, IsErroredOnProcessing: false,
            ParsedResults: [{ ParsedText: "1.1 CONCRETO ESTRUCTURAL M3 96,20" }],
          }),
          text: async () => "",
        });
        try {
          const tanda = await invocarPost(apiExtraer, "/api/apu/extraer-texto", {
            texto_extraido: "", solo_reconocer: true,
            imagenes_base64: [{ base64: "QUJD", mime: "image/jpeg" }],
          }, CAB_TOKEN);
          assert.strictEqual(tanda.status, 200);
          assert.strictEqual(tanda.cuerpo.solo_reconocer, true);
          assert.strictEqual(tanda.cuerpo.texto_ocr, "1.1 CONCRETO ESTRUCTURAL M3 96,20",
            "el texto reconocido tiene que volver, o el cliente no puede encadenar tandas");
          assert.strictEqual(tanda.cuerpo.items, undefined, "con `solo_reconocer` NO se parsea");
          assert.ok(/puede tener errores/i.test(tanda.cuerpo.advertencia),
            "la advertencia viaja también en la respuesta de solo reconocer");
        } finally {
          global.fetch = fetchOriginal;
          if (claveOriginal === undefined) delete process.env.OCRSPACE_API_KEY;
          else process.env.OCRSPACE_API_KEY = claveOriginal;
        }
      }
    }

    /* 20. SSRF en /api/apu/descargar: un endpoint que baja una URL arbitraria
       desde dentro de la infraestructura tiene que estar acotado, y la
       comprobación no puede quedarse solo en el primer salto. */
    {
      const malas = [
        "http://ejemplo.com/a.pdf",                 // sin cifrar
        "https://localhost/a.pdf",
        "https://127.0.0.1/a.pdf",
        "https://169.254.169.254/latest/meta-data",  // metadatos de la nube
        "https://10.0.0.5/a.pdf",
        "https://192.168.1.1/a.pdf",
        "https://172.16.0.1/a.pdf",
        "https://interno.local/a.pdf",
        "file:///etc/passwd",
        "no-es-una-url",
      ];
      for (const url of malas) {
        const r = await invocarPost(apiDescargar, "/api/apu/descargar", { url }, CAB_TOKEN);
        assert.strictEqual(r.status, 400, `«${url}» tenía que rechazarse con 400, llegó ${r.status}`);
      }
      /* IPv4 escrita como IPv6 y credenciales embebidas: dos formas de saltarse
         las reglas de host que las listas de literales no veían. */
      for (const url of [
        "https://[::ffff:127.0.0.1]/a.pdf",
        "https://[::ffff:169.254.169.254]/latest/meta-data",
        "https://[::1]/a.pdf",
        "https://usuario:clave@ejemplo.com/a.pdf",
      ]) {
        const r = await invocarPost(apiDescargar, "/api/apu/descargar", { url }, CAB_TOKEN);
        assert.strictEqual(r.status, 400, `«${url}» tenía que rechazarse con 400, llegó ${r.status}`);
      }

      /* Y AL CONTRARIO: las reglas de IPv6 no pueden rechazar dominios REALES.
         Escritas sin delimitador («^fc», «^fd») y aplicadas a cualquier hostname,
         bastaba que el dominio empezara por «fc» o «fd» para tratarlo como
         dirección interna, y `fdn.gov.co` es un portal público.

         Se comprueba contra `urlSegura`, que es la capa del NOMBRE. No contra el
         handler completo: la capa siguiente resuelve el DNS, y en este entorno
         todo resuelve por el proxy a direcciones privadas, así que el handler
         rechazaría estos hosts por una razón legítima y distinta —y la prueba
         mediría el sandbox en vez de la regla. */
      for (const host of ["fdn.gov.co", "fcm.org.co", "fd-publico.example", "fcbarcelona.com"]) {
        const v = apiDescargar.urlSegura(`https://${host}/pliego.pdf`);
        assert.strictEqual(v.ok, true,
          `«${host}» es un dominio público y la regla de nombre lo rechaza: ${v.error}`);
      }
      // …y la capa del nombre sigue rechazando lo que debe
      for (const host of ["localhost", "algo.internal", "[::1]", "[::ffff:127.0.0.1]", "10.0.0.5"]) {
        assert.strictEqual(apiDescargar.urlSegura(`https://${host}/a.pdf`).ok, false, `«${host}» debía rechazarse`);
      }

      /* EL ORÁCULO DE LECTURA: cuando lo descargado no es un PDF, la respuesta NO
         puede devolver bytes del cuerpo remoto. Con un destino interno alcanzable,
         eso convertía el SSRF ciego en una lectura. */
      {
        const fuenteD = sinComentarios(fs.readFileSync(path.join(__dirname, "..", "lib", "apu_descargar.js"), "utf8"));
        assert.ok(!/primeros_bytes/.test(fuenteD),
          "descargar.js no puede devolver los primeros bytes del cuerpo remoto: es un oráculo de lectura");
        assert.ok(/dns\.lookup\(/.test(fuenteD),
          "descargar.js debe RESOLVER el nombre y validar la IP: validar la cadena del hostname no protege de nada");
      }

      const malMetodo = await invocar(apiDescargar, "/api/apu/descargar", CAB_TOKEN);
      assert.strictEqual(malMetodo.status, 405);
      // el código tiene que seguir las redirecciones A MANO: seguirlas
      // automáticamente permitiría saltar de un host público a uno interno
      const fuente = fs.readFileSync(path.join(__dirname, "..", "lib", "apu_descargar.js"), "utf8");
      assert.ok(/redirect:\s*"manual"/.test(sinComentarios(fuente)),
        "descargar.js debe pedir `redirect: \"manual\"`: una redirección a una IP interna es el salto clásico del SSRF");
    }

    console.log(`· unidad APU: números colombianos, cabeceras, 3 vías de reconocimiento, 3 niveles de `
      + `validación, semáforo de 2 ejes, mapeo al catálogo (${cat.ITEMS.length} ítems), protocolo de OCR `
      + `(el fallo dentro del 200) y SSRF`);
  }

  /* unidad: el catálogo de precios APU · las tres invariantes que atan sus
     números a la investigación recuperada, y la validación que impide guardar
     un catálogo con el que se calcularían precios malos.
     ------------------------------------------------------------------------
     Los precios «recuperados» salen de `modulo_apu.html` (borrado en d69cfe8);
     los estimados son referencia razonada. La diferencia está declarada insumo
     por insumo y documentada en docs/APU_Y_RENTABILIDAD.md. */
  {
    const apu = require("../lib/apu/catalogo.js");
    const S = apu.SEMILLA;

    const v = apu.validarCatalogo();
    assert.ok(v.ok, `la semilla del catálogo no valida: ${JSON.stringify(v.errores.slice(0, 3))}`);
    assert.ok(S.insumos.length >= 20, `el encargo pide ≥20 insumos, hay ${S.insumos.length}`);
    assert.ok(S.items.length >= 15, `el encargo pide ≥15 ítems, hay ${S.items.length}`);
    assert.strictEqual(S.regiones.length, 5, "el encargo pide exactamente 5 regiones");

    /* 1 · UN CERO NO ES UN PRECIO. Es la regla de `anticipo_pct = 0` aplicada
       aquí: un insumo a 0 no es «gratis», es «no lo sé», y con él se costearía
       una oferta a la baja sin que nadie lo notara. */
    for (const i of S.insumos) {
      assert.ok(Number(i.precio_base) > 0, `insumo ${i.id} con precio_base no positivo`);
      assert.ok(["material", "mano_obra", "equipo", "transporte"].includes(i.tipo), `insumo ${i.id} con tipo inválido`);
    }

    /* 2 · LAS CUADRILLAS SON LA SUMA DE SUS JORNALES. Estaba así en la fuente
       recuperada (299.000 = 95.000 + 3 × 68.000) y es lo que impide que alguien
       suba el jornal del ayudante y deje el catálogo diciendo dos cosas
       distintas sobre el mismo día de trabajo. */
    const porId = new Map(S.insumos.map((i) => [i.id, i]));
    let cuadrillas = 0;
    for (const i of S.insumos) {
      if (!i.componentes) continue;
      cuadrillas++;
      const suma = Object.entries(i.componentes)
        .reduce((a, [ref, n]) => a + Number(porId.get(ref).precio_base) * Number(n), 0);
      assert.strictEqual(Math.round(suma), Math.round(Number(i.precio_base)),
        `la cuadrilla ${i.id} no es la suma de sus jornales`);
    }
    assert.ok(cuadrillas >= 3, "deberían declararse al menos tres cuadrillas por composición");

    /* 3 · LOS CUATRO FACTORES REGIONALES NO PUEDEN SEPARARSE DEL ÚNICO DATO
       DURO QUE LOS RESPALDA. La fuente recuperada trae UN índice por ciudad;
       la desagregación en materiales/mano de obra/equipo/transporte es
       razonada, no medida. La cerradura: recomponerlos con la estructura de
       costos típica tiene que devolver el índice de la ciudad cabecera. Si
       alguien retoca un factor «a ojo», esto lo detiene. */
    const w = S._meta.estructura_costos_obra_civil;
    assert.ok(Math.abs(w.materiales + w.mano_obra + w.equipo + w.transporte - 1) < 1e-9,
      "la estructura de costos con la que se recompone el índice debe sumar 1");
    for (const r of S.regiones) {
      const compuesto = r.factor_materiales * w.materiales + r.factor_mano_obra * w.mano_obra
        + r.factor_equipo * w.equipo + r.factor_transporte * w.transporte;
      assert.ok(Math.abs(compuesto - r.indice_ciudad_recuperado) <= 0.015,
        `${r.id}: el índice recompuesto (${compuesto.toFixed(4)}) se separa del recuperado `
        + `(${r.indice_ciudad_recuperado}) más de 0,015`);
    }

    /* 4 · el catálogo SIRVE: los 17 ítems producen costo directo positivo en
       las 5 regiones, y el gradiente regional va en el sentido correcto. */
    const concreto = S.items.find((i) => i.codigo === "INV-630.4");
    const cdPorRegion = {};
    for (const r of S.regiones) {
      for (const it of S.items) {
        assert.ok(apu.costoDirecto(it, S, r.id).total > 0, `${it.codigo} sin costo directo en ${r.id}`);
      }
      cdPorRegion[r.id] = apu.costoDirecto(concreto, S, r.id).total;
    }
    assert.ok(cdPorRegion.costa_atlantica > cdPorRegion.bogota_sabana,
      "la Costa tiene que costar más que Bogotá para un ítem intensivo en materiales");
    assert.ok(cdPorRegion.eje_cafetero < cdPorRegion.bogota_sabana,
      "el Eje Cafetero tiene que costar menos que Bogotá");

    /* 5 · EL ERROR DE LA FUENTE RECUPERADA NO SE REPLICÓ. En `modulo_apu.html`
       el APU del acero llevaba `tarifa 1200 × cant 1.05 × dist 15` = $18.900 de
       acarreo POR KILO, más del doble que el propio acero: la tarifa está en
       $/m³-km y le pasaban kilogramos. Aquí el transporte va en m³ y por eso es
       calderilla. Un APU de acero con el 78 % en acarreo haría fijar precio muy
       por encima del mercado y perder todo proceso donde el acero pese. */
    {
      const cd = apu.costoDirecto(S.items.find((i) => i.codigo === "INV-640.1"), S, "bogota_sabana");
      assert.ok(cd.capitulos.transporte / cd.total < 0.01,
        `el acarreo es el ${Math.round(cd.capitulos.transporte / cd.total * 100)} % del APU del acero: `
        + "vuelve a estar en kilogramos en vez de en m³");
      assert.ok(cd.capitulos.materiales > cd.capitulos.transporte * 100,
        "en el acero el material tiene que dominar sobre el acarreo, no al revés");
    }

    /* 6 · la validación RECHAZA, con el campo exacto señalado, y no salva nada
       a medias. Cuatro formas realistas de romper un catálogo. */
    const clonar = () => JSON.parse(JSON.stringify(S));
    const casos = [
      ["precio en cero", (c) => { c.insumos[0].precio_base = 0; }, /precio_base/],
      ["insumo fantasma", (c) => { c.items[0].insumos[0].insumo_id = "no_existe"; }, /insumo_id/],
      ["cuadrilla descuadrada", (c) => { c.insumos.find((i) => i.id === "mo_ayudante_construccion").precio_base = 80000; }, /componentes|precio_base/],
      ["rendimiento cero", (c) => {
        const it = c.items.find((x) => x.insumos.some((l) => l.rendimiento));
        it.insumos.find((l) => l.rendimiento).rendimiento = 0;
      }, /rendimiento/],
    ];
    for (const [nombre, romper, patron] of casos) {
      const roto = clonar();
      romper(roto);
      const r = apu.validarCatalogo(roto);
      assert.ok(!r.ok, `«${nombre}» debería invalidar el catálogo y no lo hizo`);
      assert.ok(r.errores.some((e) => patron.test(e.campo)),
        `«${nombre}»: ningún error señala el campo esperado (${patron}) — llegaron ${JSON.stringify(r.errores.slice(0, 2))}`);
    }

    /* 7 · derivación de precios: material y jornal NO se encarecen igual, y por
       eso el insumo lleva `tipo`. En la Costa el material sube (1,10) mientras
       el jornal baja (0,97): con un índice único los dos irían al mismo sitio. */
    {
      const costa = S.regiones.find((r) => r.id === "costa_atlantica");
      const cemento = porId.get("cemento_gris_50kg");
      const oficial = porId.get("mo_oficial_construccion");
      assert.strictEqual(apu.precioEnRegion(cemento, costa).precio,
        Math.round(cemento.precio_base * costa.factor_materiales));
      assert.strictEqual(apu.precioEnRegion(oficial, costa).precio,
        Math.round(oficial.precio_base * costa.factor_mano_obra));
      assert.ok(apu.precioEnRegion(cemento, costa).precio > cemento.precio_base
        && apu.precioEnRegion(oficial, costa).precio < oficial.precio_base,
        "en la Costa el material sube y el jornal baja: no pueden compartir factor");
      assert.strictEqual(apu.precioEnRegion(cemento, costa).origen, "derivado",
        "sin cotización real el precio es DERIVADO y tiene que decirlo");
      // una cotización real manda sobre el factor, y lo declara
      const conCotizacion = { ...cemento, precios_cotizados: { costa_atlantica: 41000 } };
      assert.deepStrictEqual(apu.precioEnRegion(conCotizacion, costa), { precio: 41000, origen: "cotizado" });
    }

    console.log(`· unidad catálogo APU: ${S.insumos.length} insumos, ${S.items.length} ítems, `
      + `${S.regiones.length} regiones · cuadrillas cuadradas, índice regional recompuesto ≤0,015 `
      + "y el acarreo del acero en m³ (no en kg)");
  }

  /* ══════════ UNIDAD · calibración Nogal, importación de Excel y libro APU ══════════
     (ago 2026, corre una vez). Tres piezas nuevas y sus cerraduras:
     1. La CALIBRACIÓN: los 157 APU del Presupuesto Nogal 4 (contrato adjudicado
        UPN-VAD-CP-009-2025) entraron al catálogo como ítems NOG-* y el motor
        tiene que REPRODUCIR el costo directo publicado en el pliego. Si esta
        igualdad se rompe, el catálogo dice precios que el contrato real no dijo.
     2. La IMPORTACIÓN: mapeo de filas de un Excel contra el catálogo, con la
        política de precios declarada (el del archivo manda; una sugerencia
        «revisar» sin precio NO cobra el catálogo por su cuenta).
     3. El LECTOR y el LIBRO: round-trip real contra el escritor propio, la vía
        DEFLATE con inflador inyectado, y las copias de `numeroLocal`/`parsearCsv`
        ATADAS ejecutándolas — no comparando strings. */
  {
    const apuCat = require("../lib/apu/catalogo.js");
    const S = apuCat.SEMILLA;
    const { mapearFilasImportadas, unidadCanonica } = require("../lib/apu/importar.js");
    const calculoApu = require("../lib/apu/calculo.js");
    const XLSXApu = require("../public/xlsx.js");
    const XLSXLectura = require("../public/xlsx_lectura.js");
    const APULibro = require("../public/apu_libro.js");
    const zlib = require("zlib");

    /* ---- 1 · la calibración reproduce el pliego adjudicado ---- */
    {
      const nogs = S.items.filter((i) => /^NOG-/.test(i.codigo));
      assert.ok(nogs.length >= 150, `la calibración Nogal debía aportar ≥150 ítems y hay ${nogs.length}`);
      assert.ok(nogs.every((i) => i.fuente === "adjudicado"),
        "todo ítem NOG-* declara fuente «adjudicado»: viene de un contrato real, no de una estimación");
      let exactos = 0, aUnPeso = 0;
      for (const it of nogs) {
        if (it.cd_adjudicado == null) continue;
        const delta = apuCat.costoDirecto(it, S, "bogota_sabana").total - Math.round(it.cd_adjudicado);
        if (it.codigo === "NOG-B57") {
          /* la única desviación admitida, y va CLAVADA: el APU original traía
             una línea de equipo con cantidad NEGATIVA (un ajuste del autor del
             pliego) que el esquema no admite; se descartó declarándolo. Si el
             delta se mueve de +55, alguien tocó el ítem sin re-litigar esto. */
          assert.strictEqual(delta, 55, `NOG-B57 debía quedar +55 sobre el pliego y quedó ${delta >= 0 ? "+" : ""}${delta}`);
          continue;
        }
        assert.ok(Math.abs(delta) <= 1,
          `${it.codigo}: el motor da ${delta > 0 ? "+" : ""}${delta} pesos contra el VR COSTO DIRECTO del pliego`);
        if (delta === 0) exactos++; else aUnPeso++;
      }
      assert.ok(exactos >= 145, `la reproducción exacta cayó a ${exactos} ítems (±$1: ${aUnPeso})`);
      // dos anclas concretas, legibles contra el archivo fuente
      const a2 = S.items.find((i) => i.codigo === "NOG-A2");
      assert.strictEqual(apuCat.costoDirecto(a2, S, "bogota_sabana").total, 24463,
        "NOG-A2 (desmonte de cubierta) debía costar exactamente $24.463, el VR COSTO DIRECTO del pliego");
      const c80 = S.items.find((i) => i.codigo === "NOG-C80");
      assert.strictEqual(apuCat.costoDirecto(c80, S, "bogota_sabana").total, 122568,
        "NOG-C80 (canaleta metálica) debía costar exactamente $122.568");
      // las cuadrillas del Nogal guardan el jornal base (÷1,55) y el motor lo
      // recompone: el día CON prestaciones tiene que volver a ±$2 del pliego
      const cuadrilla = S.insumos.find((i) => i.id === "nog_cuadrilla_1_of_1_ay");
      assert.ok(cuadrilla, "falta la cuadrilla 1 OF + 1 AY del Nogal");
      assert.ok(Math.abs(Math.round(cuadrilla.precio_base) * 1.55 - 368915.68) <= 2,
        "la cuadrilla del Nogal debía recomponer $368.915,68/día con el prestacional 1,55");
    }

    /* ---- 2 · importación: mapeo y política de precios ---- */
    {
      const filas = [
        // firme con precio del archivo: el precio del ARCHIVO manda y el ítem queda de referencia
        { codigo: "1.3", descripcion: "Suministro e instalación de canaleta metalica calibre 20-22 con división, pintura electrostática de 15x5 cm", unidad: "ML", cantidad: 14, precio_archivo: 74596 },
        // revisar SIN precio: el catálogo NO cobra por su cuenta (caso «PENDIENTE» medido)
        { descripcion: "PENDIENTE-POSIBLE USO DE RIEL Y LUMINARIA SYLVANIA", unidad: "UND", cantidad: 24 },
        // firme sin precio: el precio sale del catálogo, que es la razón de la calibración
        { descripcion: "Pisos en alfagres", unidad: "m2", cantidad: 75 },
        // personalizado puro: ni mapeo ni precio
        { descripcion: "Obra de arte conmemorativa en bronce", unidad: "und", cantidad: 1 },
        // precio 0 del archivo = SIN precio, jamás «gratis»
        { descripcion: "Salidas iluminación", unidad: "UND", cantidad: 3, precio_archivo: 0 },
      ];
      const m = mapearFilasImportadas(filas, S);
      const r = m.resumen_mapeo;
      assert.strictEqual(r.firmes + r.revisar + r.personalizados, r.total,
        "las tres categorías del mapeo tienen que SUMAR el total: una fila sin categoría desaparece en silencio");

      const canaleta = m.filas[0];
      assert.strictEqual(canaleta.entrada_calculo.precio_manual, 74596, "el precio del archivo manda");
      assert.strictEqual(canaleta.entrada_calculo.origen_precio, "archivo");
      assert.ok(canaleta.item_id, "la canaleta debía mapear al catálogo (como referencia)");

      const pendiente = m.filas[1];
      assert.strictEqual(pendiente.nivel_mapeo, "revisar");
      assert.strictEqual(pendiente.entrada_calculo.item_id, null,
        "un mapeo «revisar» SIN precio del archivo no puede cobrar el catálogo por su cuenta: eran $2,9 M inventados");
      assert.strictEqual(pendiente.entrada_calculo.precio_manual, null);

      const alfagres = m.filas[2];
      assert.strictEqual(alfagres.nivel_mapeo, "firme");
      assert.strictEqual(alfagres.entrada_calculo.item_id, "NOG-B2", "un mapeo firme sin precio usa el catálogo");

      assert.strictEqual(m.filas[4].precio_archivo, null, "un 0 del archivo no es un precio");

      /* un precio o una cantidad que llegan como TEXTO se leen con la
         convención COLOMBIANA (el punto separa MILES): el parser ingenuo leía
         «74.596» como 74,596 pesos — mil veces menos, la familia del defecto
         «375.0000». La API no puede depender de que el cliente mande números. */
      const texto = mapearFilasImportadas([
        { descripcion: "Cable", unidad: "ML", cantidad: "1.234,5", precio_archivo: "74.596" },
      ], S);
      assert.strictEqual(texto.filas[0].precio_archivo, 74596, "«74.596» como texto son 74.596 pesos, no 74,596");
      assert.strictEqual(texto.filas[0].cantidad, 1234.5);
      const manualTexto = calculoApu.calcularPresupuesto({
        items: [{ descripcion: "x", unidad: "u", cantidad: 2, precio_manual: "74.596" }],
      });
      assert.strictEqual(manualTexto.items[0].costo_directo_unitario, 74596,
        "precio_manual como texto también usa la convención colombiana");

      // el plural tolerado: sin él «Desmonte de Cielo Raso» no encontraba
      // «DESMONTES DE CIELO RASOS» (defecto medido antes de corregirlo)
      const des = mapearFilasImportadas([{ descripcion: "Desmonte de Cielo Raso", unidad: "m2", cantidad: 10 }], S);
      assert.strictEqual(des.filas[0].item_id, "NOG-A3", "el plural tolerado debía casar el desmonte con NOG-A3");

      // unidades: grafías equivalentes, sin convertir jamás
      assert.strictEqual(unidadCanonica("M"), unidadCanonica("ml"));
      assert.strictEqual(unidadCanonica("UND"), unidadCanonica("un"));
      assert.notStrictEqual(unidadCanonica("m2"), unidadCanonica("m3"));

      /* el CÁLCULO con esas entradas: el manual suma y se declara; el sin
         precio NO suma; el reparto por componente + sin_desglose cierra */
      const calc = calculoApu.calcularPresupuesto({
        items: m.filas.map((f) => f.entrada_calculo),
        departamento: "BOGOTA D.C.",
        config: { aiu_pct: 19.17, imprevistos_pct: 1.5, utilidad_pct: 5.33 },
      });
      const itCanaleta = calc.items[0];
      assert.strictEqual(itCanaleta.sin_apu, true);
      assert.strictEqual(itCanaleta.costo_directo_unitario, 74596);
      assert.strictEqual(itCanaleta.costo_total, 74596 * 14);
      assert.ok(Number.isFinite(itCanaleta.cd_catalogo) && itCanaleta.cd_catalogo !== 74596,
        "cd_catalogo debía publicar la referencia del catálogo para que la diferencia SE VEA");
      const itPendiente = calc.items[1];
      assert.strictEqual(itPendiente.incompleto, true, "sin precio y sin mapeo aceptado la fila queda SIN precio");
      assert.strictEqual(itPendiente.costo_total, null, "y publica null, jamás 0");
      const pc = calc.resumen.por_componente;
      assert.ok(Math.abs((pc.material + pc.mano_obra + pc.equipo + pc.transporte + pc.sin_desglose)
        - calc.resumen.costo_directo_total) < 1,
        "material + mano de obra + equipo + transporte + sin_desglose tiene que SUMAR el costo directo");
      assert.ok(pc.sin_desglose > 0, "los ítems con precio del archivo caen en la cubeta sin_desglose");
      assert.ok(calc.alertas.some((a) => /archivo importado/i.test(a)),
        "un precio del archivo sin APU de respaldo tiene que declararse en las alertas");
      // un precio manual en 0 tampoco es un precio por la puerta del cálculo
      const cero = calculoApu.calcularPresupuesto({
        items: [{ descripcion: "Ítem con cero", unidad: "und", cantidad: 5, precio_manual: 0 }],
      });
      assert.strictEqual(cero.items[0].incompleto, true, "precio_manual = 0 es «sin dato», no «gratis»");
    }

    /* ---- 3 · lector: round-trip real, DEFLATE inyectado y copias atadas ---- */
    await (async () => {
      const bytes = XLSXApu.construirLibro([{
        nombre: "Formulario",
        filas: [
          [{ v: "ÍTEM", s: "encabezado" }, { v: "DESCRIPCIÓN", s: "encabezado" }, { v: "UNIDAD", s: "encabezado" },
            { v: "CANTIDAD", s: "encabezado" }, { v: "VALOR UNITARIO", s: "encabezado" }],
          ["1.1", 'Tubería de 4" en PVC & <especial>', "ML", 57, 30172],
          ["CAPITULO B"],
          ["1.2", "Cable cobre No 12", "ML", null, 17552],
        ],
      }]);
      const libro = await XLSXLectura.leerLibro(bytes);
      assert.strictEqual(libro.hojas[0].nombre, "Formulario");
      assert.strictEqual(libro.hojas[0].filas[1][1], 'Tubería de 4" en PVC & <especial>',
        "el escape XML tiene que sobrevivir el viaje de ida y vuelta");
      const det = XLSXLectura.detectarFilasApu(libro.hojas[0].filas);
      assert.strictEqual(det.filas.length, 2);
      assert.strictEqual(det.filas[1].cantidad, null, "una cantidad ilegible es null, JAMÁS 0");
      assert.strictEqual(det.filas[1].capitulo, "CAPITULO B");

      /* la vía DEFLATE: un ZIP artesanal con método 8 y el inflador inyectado.
         Los tamaños salen del directorio central a propósito (un xlsx escrito
         en streaming deja el local header en 0). */
      const contenido = Buffer.from("<x>hola deflate</x>");
      const comprimido = zlib.deflateRawSync(contenido);
      const nombre = Buffer.from("prueba.xml");
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
      local.writeUInt16LE(8, 8); local.writeUInt32LE(0, 10); local.writeUInt32LE(0, 14);
      local.writeUInt32LE(0, 18); local.writeUInt32LE(0, 22); // tamaños EN CERO en el local, como el streaming
      local.writeUInt16LE(nombre.length, 26); local.writeUInt16LE(0, 28);
      const central = Buffer.alloc(46);
      central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10);
      central.writeUInt32LE(0, 16); central.writeUInt32LE(comprimido.length, 20);
      central.writeUInt32LE(contenido.length, 24); central.writeUInt16LE(nombre.length, 28);
      central.writeUInt32LE(0, 42);
      const offCentral = 30 + nombre.length + comprimido.length;
      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
      eocd.writeUInt32LE(46 + nombre.length, 12); eocd.writeUInt32LE(offCentral, 16);
      const zipDeflate = Buffer.concat([local, nombre, comprimido, central, nombre, eocd]);
      const z = XLSXLectura.leerZip(new Uint8Array(zipDeflate));
      const inflado = await z.extraer("prueba.xml", async (u8) => zlib.inflateRawSync(Buffer.from(u8)));
      assert.strictEqual(Buffer.from(inflado).toString("utf8"), "<x>hola deflate</x>",
        "una parte DEFLATE debe salir por el inflador inyectado");
      let sinInflador = null;
      try { await z.extraer("prueba.xml", null); } catch (e) { sinInflador = e.message; }
      assert.ok(/CSV/i.test(sinInflador || ""),
        "sin inflador el error tiene que ser accionable (sugerir CSV), no una lista vacía con cara de éxito");

      /* numeroLocal: TERCERA copia, atada EJECUTÁNDOLA contra lib/apu_pliego */
      const libPliego = require("../lib/apu_pliego.js");
      const fuenteLectura = fs.readFileSync(path.join(__dirname, "..", "public", "xlsx_lectura.js"), "utf8");
      const i0 = fuenteLectura.indexOf("function numeroLocal(");
      assert.ok(i0 > 0, "no se encontró numeroLocal en xlsx_lectura.js");
      const fin0 = fuenteLectura.indexOf("\n  }", i0);
      const fnNumero = new Function(`${fuenteLectura.slice(i0, fin0 + 4)}; return numeroLocal;`)();
      for (const caso of ["1.234.567,89", "1.234.567", "1.234", "1.5", "1.50", "12,5", "0,00",
        "375.0000", "3.14159", "1.2.3456", "-500", "  8.450,00  ", "2024-350", "abc", "1,2,3", "",
        "CM-001", "$ 45.000", "100", "0", "1.000.000"]) {
        assert.strictEqual(fnNumero(caso), libPliego.numeroColombiano(caso),
          `numeroLocal (xlsx_lectura) y numeroColombiano (lib) discrepan en «${caso}»`);
      }

      /* parsearCsv: la copia de onboarding y la de xlsx_lectura, EJECUTADAS
         sobre los mismos fragmentos hostiles */
      const fuenteOnboarding = fs.readFileSync(path.join(__dirname, "..", "public", "onboarding.js"), "utf8");
      const extraerFn = (src, nombreFn) => {
        const i = src.indexOf(`function ${nombreFn}(`);
        assert.ok(i > 0, `no se encontró ${nombreFn}`);
        const fin = src.indexOf("\n  }", i);
        return new Function(`${src.slice(i, fin + 4)}; return ${nombreFn};`)();
      };
      const csvOnboarding = extraerFn(fuenteOnboarding, "parsearCsv");
      const csvLectura = XLSXLectura.parsearCsv;
      for (const frag of [
        'a;b;"c;con sep";d\n1;2;3;4',
        'x;Tubería de 4" en PVC;z\n# comentario\n;;\nfin;;',
        '﻿col1,col2\n"multi\nlínea",2',
      ]) {
        assert.deepStrictEqual(csvLectura(frag), csvOnboarding(frag),
          "parsearCsv de xlsx_lectura y de onboarding divergieron: son la misma regla en dos sitios");
      }
    })();

    /* ---- 4 · el libro con formato Nogal: fórmulas, marcadores y cierre AIU ---- */
    await (async () => {
      const calc = calculoApu.calcularPresupuesto({
        items: [
          { item_id: "NOG-A2", cantidad: 126, capitulo: "CUBIERTA" },
          { descripcion: "Ítem del archivo con precio", unidad: "und", cantidad: 4, precio_manual: 98637, origen_precio: "archivo", capitulo: "RED" },
          { descripcion: "Ítem sin precio ninguno", unidad: "und", cantidad: 2 },
        ],
        departamento: "BOGOTA D.C.",
        config: { aiu_pct: 19.17, imprevistos_pct: 1.5, utilidad_pct: 5.33 },
      });
      const hojas = APULibro.construirLibroNogal(calc, { titulo: "PRUEBA NOGAL", entidad: "UPN", fecha: "2026-08-07" });
      const bytes = XLSXApu.construirLibro(hojas);
      const libro = await XLSXLectura.leerLibro(bytes);
      assert.deepStrictEqual(libro.hojas.map((h) => h.nombre), ["Presupuesto", "APU"]);

      const rejilla = libro.hojas[0].filas;
      const plana = rejilla.map((f) => (f || []).map((c) => (c == null ? "" : String(c))).join("|"));
      assert.ok(plana.some((l) => l.includes("CUBIERTA")), "el capítulo tiene que aparecer como fila propia");
      assert.ok(plana.some((l) => l.includes("COSTOS DIRECTOS")), "falta el cierre COSTOS DIRECTOS");
      assert.ok(plana.some((l) => /IVA sobre la utilidad/.test(l)),
        "el IVA sobre la utilidad es parte del formato Nogal: sin él el TOTAL no cuadra contra la referencia");
      assert.ok(plana.some((l) => l.includes("SIN PRECIO")), "el ítem sin precio tiene que quedar MARCADO, no desaparecer");
      assert.ok(plana.some((l) => /Elabor/.test(l)), "faltan las firmas (Elaboró/Revisó/Aprobó)");

      /* la fila del ítem sin precio NO puede publicar un 0 en sus celdas de
         valor: se busca su fila y se exige que no haya número */
      const filaSin = rejilla.find((f) => (f || []).some((c) => typeof c === "string" && c.includes("Ítem sin precio")));
      assert.ok(filaSin, "no se encontró la fila del ítem sin precio");
      assert.ok(typeof filaSin[4] !== "number" && typeof filaSin[5] !== "number",
        "la fila sin precio publicó dinero: un $0 sería un precio inventado (la cantidad sí puede viajar)");

      /* las fórmulas van SIN el «=» inicial en <f> (OOXML lo lleva implícito) y
         CON valor cacheado — el defecto «==D7*E7» rompía todas las celdas */
      const xml = (() => {
        const buf = Buffer.from(bytes);
        let i = 0; const partes = {};
        while (i < buf.length - 4 && buf.readUInt32LE(i) === 0x04034b50) {
          const tam = buf.readUInt32LE(i + 18); const nLen = buf.readUInt16LE(i + 26); const eLen = buf.readUInt16LE(i + 28);
          const nom = buf.slice(i + 30, i + 30 + nLen).toString("utf8");
          partes[nom] = buf.slice(i + 30 + nLen + eLen, i + 30 + nLen + eLen + tam).toString("utf8");
          i = i + 30 + nLen + eLen + tam;
        }
        return partes;
      })();
      const hoja1 = xml["xl/worksheets/sheet1.xml"];
      assert.ok(/<f>D\d+\*E\d+<\/f><v>/.test(hoja1), "las fórmulas =D×E deben viajar sin «=» y con valor cacheado");
      assert.ok(!/<f>=/.test(hoja1), "un «=» dentro de <f> produce ==FÓRMULA: la celda rota en todos los lectores");
      assert.ok(/<f>SUM\(F\d+:F\d+\)<\/f>/.test(hoja1), "falta la fórmula SUM del cierre COSTOS DIRECTOS");
      // los estilos nuevos existen y los cuatro numFmt siguen siendo cuatro
      const estilos = xml["xl/styles.xml"];
      assert.ok(estilos.includes("FFFEE2E2"), "falta el relleno rojo de alerta (fila sin precio)");
      assert.strictEqual((estilos.match(/<numFmt numFmtId="\d+" formatCode="[^"]*"\/>/g) || []).length, 4,
        "los formatos numéricos personalizados siguen siendo exactamente 4");

      /* y el TOTAL del formato Nogal: CD + (A+I+U) + IVA(U), verificado con la
         rejilla leída — el mismo número que publica el motor */
      const filaTotal = rejilla.find((f) => (f || []).some((c) => c === "TOTAL"));
      const total = filaTotal ? filaTotal.find((c) => typeof c === "number") : null;
      const esperado = Math.round(calc.resumen.precio_venta + calc.resumen.iva_sobre_utilidad);
      assert.strictEqual(total, esperado,
        "el TOTAL de la hoja tiene que ser precio_venta + IVA(U), como cierra el Presupuesto Nogal 4");
    })();

    /* ---- 5 · cableado del frontend nuevo (la página única) ---- */
    {
      const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
      for (const debe of ['id="btn-importar"', 'id="archivo-importar"', 'id="modal-importar"',
        'id="imp-tabla"', 'id="btn-imp-aplicar"', "/xlsx_lectura.js", "/apu_libro.js"]) {
        assert.ok(html.includes(debe), `index.html sin ${debe}`);
      }
      const js = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
      assert.ok(js.includes("/api/apu/importar"), "app.js no llama a la acción de importación");
      assert.ok(js.includes("DecompressionStream"), "app.js debe inflar los .xlsx DEFLATE del Excel real");
      assert.ok(!js.includes("FormData"), "el ARCHIVO no viaja al servidor: solo las filas parseadas");
      const fuenteLect = fs.readFileSync(path.join(__dirname, "..", "public", "xlsx_lectura.js"), "utf8");
      const fuenteLibro = fs.readFileSync(path.join(__dirname, "..", "public", "apu_libro.js"), "utf8");
      new Function(fuenteLect); // valida sintaxis sin ejecutar
      new Function(fuenteLibro);
    }

    console.log("· unidad importación APU: calibración Nogal reproducida (157 APU, 1 desviación declarada), "
      + "mapeo con política de precios, lector STORE+DEFLATE, copias atadas y libro Nogal auditado");
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
      // el catálogo APU tampoco lo toca ninguna purga del corpus (vive en
      // `apu:*`, como el RUP en `config:*`): si no se borra aquí, la iteración
      // siguiente encontraría el sello puesto y no ejercitaría la carga
      ...(await redis.scan("apu:*")),
    ];
    if (claves.length) await redis.del(...claves);
    for (const patron of ["licitaciones:*", "indice:*", "sync:historico:*", "equivalencias:*",
      "vocabulario:*", "config:*", "resumen:*", "cobertura:*", "apu:*"]) {
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
      ...generarDatasetDetalle(), ...generarDatasetCobertura(), ...generarDatasetModalidad()]);
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

    /* ---- EL PARÁMETRO `nivel_competencia` TIENE QUE SER INERTE (ago 2026) ----
       El filtro se retiró porque el campo sale de columnas EX-POST que SECOP II
       no publica mientras el proceso está abierto. Un parámetro retirado no
       puede volver a filtrar por la puerta de atrás, y un enlace guardado con él
       no puede vaciarle la lista a nadie: se comprueba que el total no se mueve
       con ninguno de los tres valores que antes aceptaba. */
    for (const v of ["baja", "media", "alta"]) {
      const r = await invocar(oportunidades, `/api/oportunidades?perfil=helder&nivel_competencia=${v}`, CAB_TOKEN);
      assert.strictEqual(r.cuerpo.total, cH.total,
        `?nivel_competencia=${v} volvió a filtrar un campo que no tiene base en el corpus activo`);
    }
    /* Y LA MEDIDA que sostiene todo lo anterior, sobre el corpus servido entero:
       cuántos valores DISTINTOS toma el campo. Si toma uno solo, no distingue
       nada y pintarlo era afirmar algo sin base. No se asierta el valor —el día
       que SECOP publique la columna en procesos abiertos esto cambiará y no
       tiene por qué romper la suite—, se MIDE y se publica. */
    {
      const todos = await todasLasOportunidades("perfil=helder");
      const valores = new Set(todos.map((l) => l.nivel_competencia));
      console.log(`  · «Ofertas del proceso»: ${valores.size} valor(es) distinto(s) en ${todos.length} procesos `
        + `servidos (${[...valores].join(", ")}) — por eso el chip y su filtro ya no existen`);
    }
    for (const l of cH.resultados) {
      assert.strictEqual(typeof l.anticipo_pct, "number", "falta anticipo_pct");
      assert.ok(["bajo", "medio", "alto"].includes(l.cuantia_rango), "cuantia_rango inválido");
      /* `nivel_competencia` SIGUE viajando —está en la proyección y retirarlo
         del registro exigiría una full— pero ya no se pinta ni se filtra: sale
         de columnas EX-POST y en el corpus activo no distingue nada. Se
         comprueba el tipo, no el valor; el valor se MIDE unas líneas más abajo. */
      assert.strictEqual(typeof l.nivel_competencia, "string", "falta nivel_competencia en la fila");
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
      const totalHist = conOferentes + HIST_EQUIVALENCIAS + HIST_DETALLE + HIST_COBERTURA + HIST_MODALIDAD;
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
        // los bloques dedicados (equivalencias, detalle, cobertura y modalidad)
        // viajan SIN conteo de oferentes a propósito, para que el índice de
        // competencia los cuente como «sin dato» y los tertiles no se muevan
        if (!/^CO1\.(EQV|DET|COB|MOD)\./.test(String(r.id_del_proceso))) {
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
      assert.strictEqual(metaIdx.descartados.sin_oferentes,
        HIST_EQUIVALENCIAS + HIST_DETALLE + HIST_COBERTURA + HIST_MODALIDAD - 1,
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

      /* ── el índice de BAJA se construye por el mismo endpoint y llega a la app ──
         Aquí se prueba el CABLEADO, no la aritmética (eso está en la prueba de
         unidad): que `?reconstruir_baja=true` publique, que /api/oportunidades
         lleve el campo en cada tarjeta y que el orden nuevo exista. */
      {
        const rBaja = await invocar(historico,
          "/api/sync/historico?reconstruir_baja=true&presupuesto=20000&chain=0", TOKEN);
        assert.strictEqual(rBaja.status, 200, "reconstruir_baja falló");
        assert.strictEqual(rBaja.cuerpo.done, true, "la reconstrucción de la baja no terminó");
        assert.ok(rBaja.cuerpo.baja, "el endpoint no reporta el resultado del índice de baja");
        const mb = rBaja.cuerpo.baja;
        assert.strictEqual(mb.min_procesos, 5);
        // los descartes más los analizados tienen que dar las filas leídas:
        // nadie desaparece sin quedar contado, igual que en el embudo
        const d = mb.descartados;
        assert.strictEqual(
          mb.procesos_analizados + d.sin_precio_base + d.sin_adjudicado
            + d.adjudicatario_no_definido + d.bajo_30_pct + d.sobre_110_pct,
          mb.filas_leidas,
          "los descartes del índice de baja no suman las filas leídas");

        // y NO re-extrae nada: los chunks históricos quedan como estaban
        const chunksHist = (await redis.scan(CLAVES.patronChunksHist)).length;
        assert.ok(chunksHist > 0, "el histórico debía seguir ahí");

        /* la app lo sirve: cada tarjeta lleva `baja_mercado` y nunca una cifra
           sin base (misma invariante que la banda de competencia) */
        const rOp = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=25", CAB_TOKEN);
        assert.strictEqual(rOp.status, 200);
        assert.ok(rOp.cuerpo.resultados.length > 0, "sin resultados no se puede comprobar el campo");
        for (const l of rOp.cuerpo.resultados) {
          const b = l.baja_mercado;
          assert.ok(b && typeof b.nivel === "string", "una tarjeta llegó sin baja_mercado");
          assert.ok(["alto", "medio", "bajo", "sin_dato"].includes(b.nivel), `nivel raro: ${b.nivel}`);
          if (b.nivel === "sin_dato") {
            assert.strictEqual(b.baja_mediana, null, "sin_dato no puede traer una mediana");
          } else {
            assert.ok(b.procesos_contados >= 5 && b.baja_mediana != null,
              `cifra sin base en la tarjeta: ${JSON.stringify(b)}`);
            assert.ok(b.granularidad_utilizada, "una baja con base tiene que decir de dónde sale");
          }
        }

        /* ?ordenar_por=baja: las que MENOS descuentan van primero, y `sin_dato`
           jamás se cuela en cabeza haciéndose pasar por «no descuenta nada» */
        const rOrd = await invocar(oportunidades,
          "/api/oportunidades?perfil=helder&ordenar_por=baja&por_pagina=50", CAB_TOKEN);
        assert.strictEqual(rOrd.status, 200);
        assert.strictEqual(rOrd.cuerpo.ordenado_por, "baja", "el orden nuevo no se reconoció");
        const conBase = [];
        let vistoSinDato = false;
        for (const l of rOrd.cuerpo.resultados) {
          if (!l.viable) break;                       // la viabilidad manda sobre el orden
          const b = l.baja_mercado;
          if (b.baja_mediana == null) { vistoSinDato = true; continue; }
          assert.ok(!vistoSinDato,
            "un proceso CON baja apareció después de uno sin dato: el sin_dato se coló delante");
          conBase.push(b.baja_mediana);
        }
        for (let i = 1; i < conBase.length; i++) {
          assert.ok(conBase[i] >= conBase[i - 1],
            `el orden por baja no es ascendente: ${conBase.join(" · ")}`);
        }
        // la prueba no puede pasar en vacío: si NADA clasificara, las dos
        // comprobaciones de arriba serían tautologías
        assert.ok(mb.entidades_clasificadas > 0,
          "ninguna entidad clasificó: el resto de aserciones de este bloque no probarían nada");
        console.log(`  · índice de baja: ${mb.procesos_analizados} adjudicaciones · `
          + `${mb.entidades_clasificadas} entidades clasificadas · mediana global ${mb.baja_mediana_global} % · `
          + `${conBase.length} tarjetas con baja en el orden`);
        console.log("    por modalidad: "
          + Object.entries(mb.por_modalidad || {})
            .map(([m, s]) => `${m} ${s.baja_mediana}% (${s.procesos})`).join(" · ")
          + ` · sin cubeta: ${mb.sin_modalidad}`);

        /* ── /api/indice-baja: protegido, completo, por entidad y reconstruible ── */
        assert.strictEqual((await invocar(indiceBajaApi, "/api/indice-baja")).status, 401,
          "/api/indice-baja expone inteligencia de precio: debe exigir token");
        assert.strictEqual((await invocar(indiceBajaApi, "/api/indice-baja?token=equivocado")).status, 401,
          "un token presente pero inválido tiene que dar 401, nunca degradación silenciosa");

        const rIdx = await invocar(indiceBajaApi, "/api/indice-baja", TOKEN);
        assert.strictEqual(rIdx.status, 200);
        assert.strictEqual(rIdx.cuerpo.construido, true, "el índice debía estar construido a esta altura");
        assert.ok(rIdx.cuerpo.indice.entidad && rIdx.cuerpo.grupos.entidad > 0, "el índice llegó vacío");
        // las cuatro granularidades viajan
        for (const g of ["entidad", "entidad_familia", "departamento_familia", "departamento"]) {
          assert.ok(g in rIdx.cuerpo.indice, `falta la granularidad ${g} en el índice servido`);
        }

        /* segundo golpe: la caché responde HIT y con el MISMO contenido */
        const rIdx2 = await invocar(indiceBajaApi, "/api/indice-baja", TOKEN);
        assert.strictEqual(rIdx2.cuerpo.grupos.entidad, rIdx.cuerpo.grupos.entidad,
          "la caché devolvió un índice distinto al recién calculado");

        /* ?entidad= por nombre y por NIT */
        const clasif = Object.entries(rIdx.cuerpo.indice.entidad)
          .find(([, m]) => m && !m.ref && m.nivel !== "sin_dato" && m.nombre);
        assert.ok(clasif, "no hay ninguna entidad clasificada que consultar");
        const rEnt = await invocar(indiceBajaApi,
          `/api/indice-baja?entidad=${encodeURIComponent(clasif[1].nombre)}`, TOKEN);
        assert.strictEqual(rEnt.status, 200, `consulta por nombre falló: ${JSON.stringify(rEnt.cuerpo).slice(0, 200)}`);
        assert.strictEqual(rEnt.cuerpo.entidades[0].baja_mediana, clasif[1].baja_mediana,
          "la consulta por entidad no devuelve la misma cifra que el índice completo");
        // promedio y mediana conviven, y el promedio NO se publica sin base
        assert.ok(rEnt.cuerpo.entidades[0].baja_promedio != null, "falta baja_promedio");
        assert.ok(rEnt.cuerpo.entidades[0].procesos_contados >= 5);
        if (clasif[1].nit) {
          const rNit = await invocar(indiceBajaApi, `/api/indice-baja?entidad=${clasif[1].nit}`, TOKEN);
          assert.strictEqual(rNit.status, 200, "la consulta por NIT debía resolver");
          assert.ok(rNit.cuerpo.entidades.length >= 1);
        }
        assert.strictEqual((await invocar(indiceBajaApi, "/api/indice-baja?entidad=ENTIDAD+QUE+NO+EXISTE", TOKEN)).status, 404,
          "una entidad sin registro debe dar 404, no un objeto vacío que parezca un cero");

        /* ── ?modalidad= : la baja abierta por modalidad de contratación ──
           La mediana global mezcla mínima cuantía —adjudicada una y otra vez por
           el presupuesto oficial— con licitación pública, donde sí se compite por
           precio, y leerla como «aquí no hay que descontar» cuesta procesos. */
        {
          const porMod = rIdx.cuerpo.meta.por_modalidad;
          assert.ok(porMod && Object.keys(porMod).length, "la meta tiene que traer `por_modalidad`");
          /* las cubetas suman los analizados, también de punta a punta y sobre
             el corpus generado: es la invariante que impide que una modalidad se
             pierda en silencio */
          const enCubetas = Object.values(porMod).reduce((a, s) => a + s.procesos, 0);
          assert.strictEqual(enCubetas + rIdx.cuerpo.meta.sin_modalidad, rIdx.cuerpo.meta.procesos_analizados,
            "las cubetas de modalidad más `sin_modalidad` no suman los analizados");
          for (const m of Object.keys(porMod)) {
            assert.ok(rIdx.cuerpo.meta.modalidades_conocidas.includes(m),
              `la cubeta «${m}» no está entre las modalidades conocidas: se agrupó algo que la ingesta no acepta`);
          }

          /* DOS cubetas como mínimo, y con MEDIANAS DISTINTAS. Sin esto la
             prueba comprobaría el cableado sobre una sola modalidad: filtraría
             bien y no demostraría nada del defecto, que es precisamente que
             mezclarlas devuelve una cifra que no describe a ninguna. */
          assert.ok(Object.keys(porMod).length >= 2,
            "el corpus de prueba tiene que traer al menos dos modalidades: con una sola, "
            + "`?modalidad=` no puede demostrar que discrimina");
          const lp = porMod["licitacion publica"], mc = porMod["minima cuantia"];
          assert.ok(lp && mc, "faltan las dos cubetas del bloque de modalidad");
          assert.ok(lp.baja_mediana > mc.baja_mediana,
            `la licitación pública tiene que descontar más que la mínima cuantía (${lp.baja_mediana} vs ${mc.baja_mediana}): `
            + "si coincidieran, separar por modalidad no cambiaría ninguna decisión y la prueba sería decorativa");
          const laMod = "licitacion publica";
          const rMod = await invocar(indiceBajaApi,
            `/api/indice-baja?modalidad=${encodeURIComponent(laMod)}`, TOKEN);
          assert.strictEqual(rMod.status, 200, `?modalidad= falló: ${JSON.stringify(rMod.cuerpo).slice(0, 200)}`);
          assert.strictEqual(rMod.cuerpo.modalidad, laMod);
          assert.deepStrictEqual(rMod.cuerpo.global_modalidad, porMod[laMod],
            "la global servida con ?modalidad= tiene que ser la MISMA de la meta, no un segundo cálculo");
          // filtra de verdad: nunca puede devolver más grupos que el índice entero
          assert.ok(rMod.cuerpo.grupos.entidad <= rIdx.cuerpo.grupos.entidad,
            "el índice filtrado por modalidad no puede tener más grupos que el completo");
          for (const reg of Object.values(rMod.cuerpo.indice.entidad)) {
            assert.strictEqual(reg.modalidad, laMod, "un grupo servido bajo ?modalidad= tiene que ser de esa modalidad");
            assert.ok(reg.procesos_todas_las_modalidades >= reg.procesos,
              "el conteo de la cubeta no puede superar al del grupo entero");
          }

          /* una modalidad desconocida es 400 CON la lista, no un 200 vacío:
             escribir mal el parámetro y recibir «no hay datos» es
             indistinguible de que no los haya */
          const rMala = await invocar(indiceBajaApi, "/api/indice-baja?modalidad=contratacion+directa", TOKEN);
          assert.strictEqual(rMala.status, 400,
            "la contratación directa no está en el histórico (la ingesta la descarta): 400, no 200 vacío");
          assert.ok(Array.isArray(rMala.cuerpo.modalidades_validas) && rMala.cuerpo.modalidades_validas.length,
            "un 400 por modalidad tiene que decir cuáles son las válidas");
          assert.strictEqual((await invocar(indiceBajaApi, "/api/indice-baja?modalidad=", TOKEN)).status, 400,
            "?modalidad= vacío es un error de la petición, no «todas»");

          /* ?entidad= y ?modalidad= COMPONEN */
          const rEntMod = await invocar(indiceBajaApi,
            `/api/indice-baja?entidad=${encodeURIComponent(clasif[1].nombre)}&modalidad=${encodeURIComponent(laMod)}`,
            TOKEN);
          assert.ok([200, 404].includes(rEntMod.status), "entidad+modalidad debe resolver o dar un 404 explicado");
          if (rEntMod.status === 200) {
            assert.strictEqual(rEntMod.cuerpo.modalidad, laMod);
            assert.strictEqual(rEntMod.cuerpo.entidades[0].modalidad, laMod);
          } else {
            assert.strictEqual(rEntMod.cuerpo.entidad_encontrada, true,
              "un 404 por falta de esa modalidad tiene que distinguirse del 404 de entidad inexistente");
          }
        }

        /* ── la tarjeta usa la modalidad DEL PROCESO ──
           `bajaDeMercado` la lee del propio registro, así que /api/oportunidades
           no necesitó cambiar: lo que hay que comprobar es que la modalidad
           llegó viva hasta la fila servida y que el refinamiento se aplicó. */
        {
          const rTar = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=60", CAB_TOKEN);
          const conMod = rTar.cuerpo.resultados.filter(
            (l) => l.baja_mercado && l.baja_mercado.modalidad_utilizada);
          assert.ok(conMod.length > 0,
            "ninguna tarjeta se refinó por modalidad: el resto de aserciones de este bloque no probarían nada");
          for (const l of conMod) {
            assert.ok(rIdx.cuerpo.meta.modalidades_conocidas.includes(l.baja_mercado.modalidad_utilizada),
              "una tarjeta trae una modalidad que no es una cubeta conocida");
            assert.ok(l.baja_mercado.baja_mediana != null && l.baja_mercado.procesos_contados >= 5,
              "una baja refinada por modalidad sigue exigiendo base: mínimo de procesos y mediana presente");
          }
          // el campo viaja SIEMPRE, también cuando no hubo refinamiento: si
          // faltara, un consumidor no podría distinguir «no se refinó» de «no
          // existe el campo» — la misma cerradura que `granularidad_utilizada`
          for (const l of rTar.cuerpo.resultados) {
            if (!l.baja_mercado) continue;
            assert.ok("modalidad_utilizada" in l.baja_mercado,
              "`modalidad_utilizada` tiene que viajar en TODA baja servida, aunque sea null");
          }
        }

        /* reconstrucción por el endpoint dedicado */
        const rRe = await invocar(indiceBajaApi, "/api/indice-baja?reconstruir=true", TOKEN);
        assert.strictEqual(rRe.status, 200);
        assert.strictEqual(rRe.cuerpo.reconstruido.done, true, "la reconstrucción manual no terminó");

        /* ── el gating por token: baja_* SOLO con credencial ──
           `/api/oportunidades` es el único endpoint con token OPCIONAL. La baja
           es inteligencia de precio y no puede salir sin él. */
        const rPub = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=10");
        assert.strictEqual(rPub.status, 200, "sin token la app pública tiene que seguir respondiendo");
        assert.strictEqual(rPub.cuerpo.finanzas_visibles, false);
        for (const l of rPub.cuerpo.resultados) {
          assert.strictEqual(l.baja_entidad, null, "baja_entidad salió sin token");
          assert.strictEqual(l.baja_segmento, null, "baja_segmento salió sin token");
          assert.strictEqual(l.baja_mercado, null, "baja_mercado salió sin token");
        }
        // y el texto tampoco puede llevar la cifra dentro (lección de p3_caja)
        assert.ok(!/[Dd]escuento t[íi]pico del/.test(JSON.stringify(rPub.cuerpo)),
          "un mensaje de baja se coló en la respuesta pública");

        /* NI POR LA PUERTA DE AL LADO: el desglose de `p_ganar` llevaba el mismo
           número dentro. El ajuste decía «la entidad adjudica ~8 % por debajo
           del presupuesto» y su `factor` es, desde que la baja es una rampa
           CONTINUA, invertible: de un ×1,0583 se despeja una mediana de 2,5 %
           exacta. Redactar `baja_mercado` y dejar esto es la misma redacción de
           mentira que ya se corrigió dos veces (p2_k y p3_caja). */
        for (const l of rPub.cuerpo.resultados) {
          for (const a of (l.p_ganar_detalle && l.p_ganar_detalle.ajustes) || []) {
            if (a.nombre !== "baja_mercado") continue;
            assert.strictEqual(a.factor, null,
              `el factor de baja salió sin token (${a.factor}): es invertible y revela la mediana exacta`);
            assert.ok(!/\d/.test(a.motivo), `el motivo del ajuste de baja lleva una cifra: «${a.motivo}»`);
          }
        }
        // el ajuste NO se borra: que exista es un hecho, y esconderlo sería otra
        // forma de mentir. Lo que se tapa es la cifra.
        const conAjusteBaja = rPub.cuerpo.resultados
          .filter((l) => ((l.p_ganar_detalle || {}).ajustes || []).some((a) => a.nombre === "baja_mercado"));
        assert.ok(conAjusteBaja.length > 0,
          "el ajuste por baja desapareció del desglose público: tapar la cifra no es borrar el ajuste");

        /* Y con token el mismo ajuste SÍ trae su factor: si no, la redacción
           pública estaría rompiendo el desglose para todo el mundo. */
        {
          const rTok = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=10", CAB_TOKEN);
          const conFactor = rTok.cuerpo.resultados
            .flatMap((l) => ((l.p_ganar_detalle || {}).ajustes || []))
            .filter((a) => a.nombre === "baja_mercado");
          assert.ok(conFactor.length > 0 && conFactor.every((a) => typeof a.factor === "number"),
            "con token el ajuste de baja tiene que traer su factor numérico");
        }

        /* con token vuelven, y baja_entidad coincide con la mediana del objeto */
        const rPriv = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=25", CAB_TOKEN);
        let conBaja = 0;
        for (const l of rPriv.cuerpo.resultados) {
          if (l.baja_mercado && l.baja_mercado.baja_mediana != null) {
            conBaja++;
            assert.strictEqual(l.baja_entidad, l.baja_mercado.baja_mediana,
              "baja_entidad y baja_mercado.baja_mediana no pueden discrepar");
          } else {
            assert.strictEqual(l.baja_entidad, null, "sin base, baja_entidad tiene que ser null");
          }
          if (l.baja_segmento) {
            assert.ok(l.baja_segmento.procesos >= 3 && l.baja_segmento.baja_mediana != null,
              `segmento sin base: ${JSON.stringify(l.baja_segmento)}`);
          }
        }
        assert.ok(conBaja > 0, "con token ninguna tarjeta trajo baja: el gating no se estaría probando");
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
      // 1/(1+3) = 0,25, y ese 0,25 es TODO el efecto de la competencia: el
      // tertil ya no multiplica encima (era el mismo promedio dos veces)
      assert.ok(Math.abs(conBaja[0].p_ganar_detalle.base - 0.25) < 1e-6,
        `P base con promedio 3 debería ser 0,25 y fue ${conBaja[0].p_ganar_detalle.base}`);
      for (const l of todas) {
        assert.ok(!(l.p_ganar_detalle.ajustes || []).some((a) => /^competencia_/.test(a.nombre)),
          `reapareció el ajuste por tertil de competencia en ${l.id_del_proceso}`);
      }
      /* Una entidad de competencia alta tiene que quedar por debajo de una baja
         —esa es la señal de verdad y sigue viva—, pero ahora sale ENTERA de
         `1/(1+rivales)` y no de un multiplicador por tertil. Se comprueban las
         dos cosas: el orden, y que el orden ya está en las bases. */
      const conAlta = todas.filter((l) => l.competencia_entidad.nivel === "alta");
      assert.ok(conAlta.length > 0 && conAlta[0].p_ganar < conBaja[0].p_ganar,
        "la entidad de alta competencia no puede tener más probabilidad que la de baja");
      assert.ok(conAlta[0].p_ganar_detalle.base < conBaja[0].p_ganar_detalle.base,
        "el orden entre bandas de competencia tiene que estar ya en la base, sin ayuda de ningún factor");

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
      const { estimarPDetalle, valorEsperado, PROMEDIO_CONSERVADOR, factorBaja,
        FACTOR_CIERRE_PRORROGADO, FACTOR_COLISION_CIERRES,
        FACTOR_BAJA_ALTA, FACTOR_BAJA_BAJA, BAJA_ALTA_DESDE, BAJA_BAJA_HASTA } = require("../lib/probabilidad.js");
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
      assert.strictEqual(d3.p, 0.25, "sin baja histórica, P(ganar) es exactamente 1/(1+rivales)");
      assert.strictEqual(d3.fuente, "entidad");

      /* EL TERTIL DE COMPETENCIA NO PUEDE VOLVER A MULTIPLICAR (ago 2026).
         Era el MISMO promedio dos veces: `nivel` es el tertil de
         `promedio_oferentes`, que ya está dentro de `rivales`. Con los tres
         niveles sobre el mismo promedio, `p` tiene que salir IDÉNTICA — si un
         día difieren, alguien volvió a meter el doble conteo. */
      const porNivel = ["baja", "media", "alta"].map((nivel) =>
        estimarPDetalle({}, { competencia: { ...comp3, nivel } }));
      for (const d of porNivel) {
        assert.strictEqual(d.p, 0.25,
          `el tertil de competencia volvió a mover P(ganar): nivel «${d.ajustes.map((a) => a.nombre)}» dio ${d.p}`);
        assert.ok(!d.ajustes.some((a) => /^competencia_/.test(a.nombre)),
          "reapareció un ajuste por tertil de competencia en el desglose");
      }
      /* Y el MISMO número de rivales tiene que dar la MISMA probabilidad venga
         del histórico de la entidad o del respaldo departamental. Antes no:
         el respaldo no trae `nivel`, así que la entidad se llevaba un ×1,30
         gratis y el departamento no — ×1,30 de diferencia por el ORIGEN del
         dato y no por el mercado. */
      assert.strictEqual(
        estimarPDetalle({}, { competencia: { nivel: "baja", promedio_oferentes: 2, total_procesos: 40 } }).p,
        estimarPDetalle({}, { promedio_departamento: 2 }).p,
        "dos rivales son dos rivales: el origen del dato no puede cambiar la probabilidad");

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

      /* ══════ LA BAJA DE MERCADO ES UNA RAMPA, NO UN ESCALÓN (ago 2026) ══════
         El defecto: dos entidades con 4,9 % y 5,1 % de baja son la MISMA entidad
         medida dos veces —el índice publica con resolución de 1 punto porcentual—
         y recibían un 15 % de diferencia de probabilidad. Se comprueba la función
         AISLADA porque continuidad y monotonía son propiedades suyas: mirarlas a
         través de `estimarPDetalle` las mezclaría con el clamp y los otros dos
         factores. */
      {
        // los EXTREMOS no se movieron: fuera de la banda, idéntico a antes
        assert.strictEqual(factorBaja(0), FACTOR_BAJA_BAJA, "adjudicar por el oficial sigue siendo ×1,10");
        assert.strictEqual(factorBaja(BAJA_BAJA_HASTA), FACTOR_BAJA_BAJA);
        assert.strictEqual(factorBaja(BAJA_ALTA_DESDE), FACTOR_BAJA_ALTA);
        assert.strictEqual(factorBaja(8), FACTOR_BAJA_ALTA, "descontar 8 % sigue siendo ×0,85");
        assert.strictEqual(factorBaja(70), FACTOR_BAJA_ALTA);
        assert.strictEqual(factorBaja(-10), FACTOR_BAJA_BAJA, "una baja negativa leve es un dato, no un error");

        /* SIN DATO ≠ 0 %. `numero()` no vale de guarda: `Number(null)` y
           `Number("")` son 0, los dos finitos, así que una ausencia entraría
           como «baja del 0 %» y saldría premiada con ×1,10 — «no sé» convertido
           en «adjudica por el presupuesto oficial». */
        for (const v of [null, undefined, "", "abc", NaN]) {
          assert.strictEqual(factorBaja(v), null, `factorBaja(${JSON.stringify(v)}) tiene que ser null, no un factor`);
        }
        /* Y la guarda tiene que estar VIVA en el camino real, no solo cuando se
           llama a `factorBaja` a pelo: si quien llama hace `numero()` antes, el
           null llega convertido en 0 y la guarda queda en código muerto. Este
           registro EXISTE — `indice:baja` no se purga nunca y un hash de una
           versión anterior puede traer nivel clasificado con mediana ausente. */
        const nivelSinMediana = estimarPDetalle({}, {
          competencia: comp3, baja: { nivel: "medio", baja_mediana: null, procesos_contados: 40 },
        });
        assert.deepStrictEqual(nivelSinMediana.ajustes, [],
          "nivel clasificado con mediana ausente: el 0 de `numero(null)` se coló como «baja del 0 %»");
        assert.strictEqual(nivelSinMediana.p, 0.25, "una mediana ausente no puede mover la probabilidad");

        // CONTINUIDAD: ningún par de bajas contiguas puede saltar
        let saltoMax = 0, dondeMax = null;
        for (let b = -5; b <= 20; b += 0.01) {
          const d = Math.abs(factorBaja(b + 0.01) - factorBaja(b));
          if (d > saltoMax) { saltoMax = d; dondeMax = b; }
        }
        assert.ok(saltoMax < 0.002, `la rampa salta ${saltoMax.toFixed(4)} en baja=${dondeMax}: no es continua`);

        // MONOTONÍA: más descuento exigido nunca puede subir la probabilidad
        let prev = Infinity;
        for (let b = -10; b <= 70; b += 0.05) {
          const f = factorBaja(b);
          assert.ok(f <= prev + 1e-12, `la rampa sube en baja=${b}: ${prev} → ${f}`);
          prev = f;
        }

        // el punto medio interpola de verdad (ni escalón ni plano)
        assert.ok(factorBaja(3.5) < factorBaja(2.5) && factorBaja(2.5) < FACTOR_BAJA_BAJA,
          "la banda intermedia tiene que interpolar, no quedarse plana");

        /* Y lo que cierra el defecto, en la escala de la FUNCIÓN: cruzar el corte
           viejo del 5 % ya no puede costar un 15 %. */
        const conBajaDe = (m) => estimarPDetalle({}, {
          competencia: comp3, baja: { nivel: "medio", baja_mediana: m, procesos_contados: 30 },
        }).p;
        const salto5 = 1 - conBajaDe(5.1) / conBajaDe(4.9);
        assert.ok(salto5 < 0.02, `cruzar el 5 % todavía cuesta ${(salto5 * 100).toFixed(1)} % de probabilidad`);
        const salto2 = Math.abs(1 - conBajaDe(2.1) / conBajaDe(1.9));
        assert.ok(salto2 < 0.02, `cruzar el 2 % todavía cuesta ${(salto2 * 100).toFixed(1)} % de probabilidad`);

        /* ── PERO 4,9 Y 5,1 NO EXISTEN EN PRODUCCIÓN, y medir solo ahí sería
           medirse a uno mismo. `lib/indice_baja` publica la mediana como una
           cubeta ENTERA del histograma (`Math.round`), así que el dominio real
           es {…, 2, 3, 4, 5, …} y lo que el dueño ve es una ESCALERA DE CUATRO
           PELDAÑOS, no una curva. Lo que mejora es la ALTURA del peldaño más
           alto, y eso es lo que hay que fijar: si alguien vuelve a los
           escalones, este número se dispara al 15 %. */
        let peorSalto = 0, dondePeor = null;
        for (let m = -10; m < 70; m++) {
          const d = Math.abs(1 - factorBaja(m + 1) / factorBaja(m));
          if (d > peorSalto) { peorSalto = d; dondePeor = `${m}→${m + 1}`; }
        }
        assert.ok(peorSalto < 0.09,
          `entre medianas enteras contiguas el salto llega al ${(peorSalto * 100).toFixed(1)} % en ${dondePeor}`);

        /* LAS COMPARACIONES PASARON DE ESTRICTAS A INCLUSIVAS, y eso mueve dos
           valores FRECUENTES. Antes `> 5` y `< 2` dejaban las medianas de
           exactamente 2 y 5 en la zona neutra (×1,00). Se fijan aquí para que
           nadie «restaure» el `>` sin enterarse de que cambia el corpus real:
           la ALCALDÍA DE PURIFICACIÓN tiene mediana exactamente 5. */
        assert.strictEqual(factorBaja(BAJA_BAJA_HASTA), FACTOR_BAJA_BAJA,
          "una mediana de exactamente 2 tiene que recibir el factor de la meseta baja, no el neutro");
        assert.strictEqual(factorBaja(BAJA_ALTA_DESDE), FACTOR_BAJA_ALTA,
          "una mediana de exactamente 5 tiene que recibir el factor de la meseta alta, no el neutro");

        /* EL DESGLOSE TIENE QUE CUADRAR CON SU PROPIO RESULTADO: el factor que
           se publica es el mismo (redondeado) que se aplicó, así que
           `base × Π factores` reproduce `p` a mano desde la tarjeta. Publicar un
           factor y multiplicar por otro sería una explicación que no explica. */
        for (const m of [0, 3, 3.2, 4, 8]) {
          const d = estimarPDetalle({ _cierre_prorrogado: true }, {
            competencia: comp3, colision_cierres: 3,
            baja: { nivel: "medio", baja_mediana: m, procesos_contados: 30 },
          });
          const producto = d.ajustes.reduce((acc, a) => acc * a.factor, d.base);
          assert.ok(Math.abs(producto - d.p) <= 5e-5 + 1e-12,
            `el desglose no cuadra con baja=${m} %: ${d.base} × ${d.ajustes.map((a) => a.factor).join(" × ")} = ${producto} pero p=${d.p}`);
          assert.strictEqual(d.ajustes.filter((a) => a.nombre === "baja_mercado").length, 1,
            "la baja tiene que emitir UN ajuste y solo uno");
        }
        /* Y no solo en cinco casos escogidos: barrido amplio. El error TIENE que
           quedar en media unidad del último decimal publicado (5e-5), que es el
           suelo teórico —el redondeo final de `p`—. Si alguien vuelve a redondear
           la base AL PUBLICARLA en vez de al calcularla, esto sube a 1,2e-4 y la
           tarjeta enseña una cuenta que no da su propio resultado. */
        {
          let peor = 0, caso = null;
          for (let r = 0.5; r <= 25; r += 0.13) {
            for (const m of [null, 0, 1, 2, 3, 4, 5, 8, 12]) {
              for (const pro of [false, true]) {
                for (const col of [0, 3]) {
                  const d = estimarPDetalle({ _cierre_prorrogado: pro }, {
                    competencia: { nivel: "media", promedio_oferentes: r, total_procesos: 40 },
                    baja: m == null ? null : { nivel: "medio", baja_mediana: m, procesos_contados: 40 },
                    colision_cierres: col,
                  });
                  // el clamp rompe la identidad A PROPÓSITO: ahí `p` ya no es el producto
                  if (d.p >= 0.95 || d.p <= 0.01) continue;
                  const err = Math.abs(d.ajustes.reduce((acc, a) => acc * a.factor, d.base) - d.p);
                  if (err > peor) { peor = err; caso = { base: d.base, factores: d.ajustes.map((a) => a.factor), p: d.p }; }
                }
              }
            }
          }
          assert.ok(peor <= 5e-5 + 1e-12,
            `el desglose se desvía ${peor.toExponential(2)} de su propio resultado: ${JSON.stringify(caso)}`);
        }
        /* Con dato, el ajuste viaja SIEMPRE —también cuando el factor sale
           exactamente 1—; sin dato, jamás. Así la ausencia del ajuste solo puede
           significar «no hay baja histórica», y no se puede volver a confundir
           «no sé» con «no mueve nada». */
        const enUno = estimarPDetalle({}, {
          competencia: comp3, baja: { nivel: "medio", baja_mediana: 3.2, procesos_contados: 30 },
        });
        assert.strictEqual(enUno.p, 0.25, "en el cruce de la rampa el factor es 1 y p no se mueve");
        assert.ok(enUno.ajustes.some((a) => a.nombre === "baja_mercado" && a.factor === 1),
          "con dato, el ajuste tiene que viajar aunque su factor sea 1");
        const sinBaja = estimarPDetalle({}, {
          competencia: comp3, baja: { nivel: "sin_dato", baja_mediana: null, procesos_contados: 3 },
        });
        assert.deepStrictEqual(sinBaja.ajustes, [], "una baja «sin_dato» no puede emitir ningún ajuste");
        assert.strictEqual(sinBaja.p, 0.25, "una baja «sin_dato» no puede mover la probabilidad");
      }

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

    /* f-ter-ter. DESGLOSE JUSTIFICADO DE LA PROBABILIDAD (ago 2026).
       «Prob. estimada: 23 %» sin justificar es una caja negra. El endpoint
       abre la cifra en seis pasos con fórmula, datos, fuente y aporte en
       puntos porcentuales.

       DOS INVARIANTES SOSTIENEN TODO EL MÓDULO, y sin ellas no serviría para
       auditar nada:
         (1) `probabilidad_final` es EXACTAMENTE el `p_ganar` que /api/oportunidades
             sirve para ese mismo proceso. Si divergieran, el desglose estaría
             explicando un cálculo distinto del que se enseña — la peor forma
             posible de equivocarse aquí.
         (2) la suma de los `aporte_pp` de los seis pasos es EXACTAMENTE la
             cifra final. Una tabla de aportes que no cuadra con su total es
             peor que no tener tabla.
       Más la regla de honestidad: un paso sin datos aporta 0 pp, nunca una
       aproximación. */
    {
      const desgloseDe = (qs, cab = CAB_TOKEN) =>
        invocar(detalleComp, `/api/competencia-detalle?vista=probabilidad&${qs}`, cab);

      /* 0 · protección: el endpoint abre el corpus, así que exige token. Un
         token PRESENTE pero inválido es 401, jamás una degradación silenciosa. */
      const sinToken = await desgloseDe("id_proceso=CO1.REQ.1", {});
      assert.strictEqual(sinToken.status, 401, "el desglose sin token tiene que dar 401");
      assert.strictEqual(sinToken.cuerpo.ok, false);
      const tokenMalo = await desgloseDe("id_proceso=CO1.REQ.1", { "x-historico-token": "no-es" });
      assert.strictEqual(tokenMalo.status, 401, "un token inválido tiene que dar 401");

      /* 1 · argumentos: sin id → 400 con la forma de llamarlo; id inexistente
         → 404 con el motivo, nunca un 200 con el desglose de otra cosa. */
      const sinId = await desgloseDe("", CAB_TOKEN);
      assert.strictEqual(sinId.status, 400, "sin id_proceso tiene que dar 400");
      assert.ok(/id_proceso/.test(sinId.cuerpo.error), "el 400 debe nombrar el parámetro que falta");
      assert.ok(sinId.cuerpo.como_hacerlo, "un 400 sin ejemplo de uso deja al dueño sin saber qué hacer");
      const noExiste = await desgloseDe("id_proceso=CO1.REQ.NO-EXISTE-JAMAS", CAB_TOKEN);
      assert.strictEqual(noExiste.status, 404, "un id inexistente tiene que dar 404");
      // y una vista inventada muere ANTES de tocar Redis o gastar el token
      const vistaMala = await invocar(detalleComp, "/api/competencia-detalle?vista=inventada", CAB_TOKEN);
      assert.strictEqual(vistaMala.status, 400, "una vista desconocida tiene que dar 400");

      /* 2 · un proceso real del corpus, con todos sus datos */
      const servidos = await todasLasOportunidades("perfil=helder");
      const conId = servidos.filter((l) => l.id_del_proceso);
      assert.ok(conId.length > 0, "ningún proceso servido trae id_del_proceso: el modal no tendría a qué llamar");
      const muestra = conId[0];
      const r = await desgloseDe(`id_proceso=${encodeURIComponent(muestra.id_del_proceso)}`);
      assert.strictEqual(r.status, 200, `el desglose de ${muestra.id_del_proceso} falló: ${JSON.stringify(r.cuerpo).slice(0, 200)}`);
      const d = r.cuerpo;
      assert.strictEqual(d.ok, true);
      assert.strictEqual(d.corpus, "activo", "un proceso servido por la app vive en el corpus activo");

      /* 3 · LOS SEIS PASOS, en orden y con todos sus campos. Van SIEMPRE los
         seis, también los que no aplican: publicar solo los que mordieron
         dejaría al lector sin poder distinguir «no hubo prórroga» de «no se
         miró la prórroga», que es justo la distinción que esto existe para
         hacer. */
      const ESPERADOS = [
        "Probabilidad base por competencia histórica",
        "Nivel de competencia de la entidad (informativo: NO multiplica)",
        "Ajuste por prórroga del cierre",
        "Ajuste por baja de mercado de la entidad",
        "Ajuste por colisión de cierres",
        "Límite final y redondeo",
      ];
      assert.strictEqual(d.desglose.length, 6, `el desglose debe traer 6 pasos y trajo ${d.desglose.length}`);
      assert.deepStrictEqual(d.desglose.map((s) => s.nombre), ESPERADOS, "los pasos no son los esperados o están desordenados");

      /* EL PASO 2 NARRA, NO MULTIPLICA (ago 2026). Se conserva como paso porque
         el nivel SÍ se le enseña al dueño en la tarjeta y hay que explicarle por
         qué un «competencia baja» bien visible no suma un punto; lo que no puede
         es volver a mover la cifra. Se comprueban las dos mitades: aporta 0 pp y
         su factor publicado es exactamente 1. */
      const paso2 = d.desglose[1];
      assert.strictEqual(paso2.aporte_pp, 0,
        `el paso del tertil volvió a mover la probabilidad: ${paso2.aporte_pp} pp`);
      assert.strictEqual(paso2.datos_entrada.factor_aplicado, 1,
        "el paso del tertil publica un factor distinto de 1: volvió a multiplicar");
      assert.ok(/DOS VECES/.test(paso2.fundamento),
        "el paso del tertil tiene que explicar POR QUÉ no multiplica, no solo callarse");

      /* Y el paso 4 emite UN solo ajuste continuo, no los dos escalones. */
      const paso4 = d.desglose[3];
      assert.ok(/interpolaci[óo]n lineal/.test(paso4.formula),
        `el paso de la baja no declara la interpolación: «${paso4.formula}»`);
      assert.ok(!/baja_alta|baja_baja/.test(JSON.stringify(d.desglose)),
        "reaparecieron los nombres de los dos escalones de la baja en el desglose");

      /* LA CADENA TIENE QUE CUADRAR DE ARRIBA ABAJO: cada paso parte de donde
         terminó el anterior. Es lo único que hace del desglose una explicación
         y no una lista de números sueltos. */
      for (let i = 1; i < d.desglose.length; i++) {
        const prev = d.desglose[i - 1].resultado, act = d.desglose[i].calculo;
        if (!act || act.startsWith("sin dato")) continue;
        const entra = act.match(/^([\d.]+)/);
        if (!entra) continue;
        assert.ok(Math.abs(Number(entra[1]) - Number(String(prev).replace("%", "")) / 100) < 1e-3,
          `el paso ${i + 1} no arranca donde terminó el ${i}: «${prev}» → «${act}»`);
      }
      const CONFIANZAS = ["Alta", "Media", "Baja", "Sin dato"];
      d.desglose.forEach((s, i) => {
        assert.strictEqual(s.paso, i + 1, "los pasos deben venir numerados 1..6");
        for (const campo of ["nombre", "formula", "datos_entrada", "calculo", "resultado", "confianza", "fundamento"]) {
          assert.ok(s[campo] !== undefined && s[campo] !== null && s[campo] !== "",
            `el paso ${s.paso} llegó sin «${campo}»`);
        }
        assert.ok(CONFIANZAS.includes(s.confianza), `confianza «${s.confianza}» fuera del vocabulario`);
        assert.ok(typeof s.aporte_pp === "number" && Number.isFinite(s.aporte_pp),
          `el paso ${s.paso} no trae un aporte numérico`);
        assert.ok(s.datos_entrada.fuente, `el paso ${s.paso} no cita la fuente de sus datos`);
        /* HONESTIDAD: un AJUSTE sin dato aporta CERO. Aproximar «porque casi
           siempre es 1» es exactamente lo que este proyecto prohíbe en
           `anticipo_pct = 0` y en el contador de oferentes.
           El paso 1 queda FUERA de la regla a propósito y no por comodidad: es
           la BASE, no un ajuste, y un cero ahí dejaría la probabilidad en cero
           —otro número inventado— en vez de en el supuesto conservador. Su
           «Sin dato» se cobra por otra vía, la de abajo: tiene que declarar el
           supuesto por escrito. */
        if (s.confianza === "Sin dato" && s.paso >= 2 && s.paso <= 5) {
          assert.strictEqual(s.aporte_pp, 0, `el ajuste del paso ${s.paso} dice «Sin dato» y aun así aporta ${s.aporte_pp} pp`);
        }
      });
      const base = d.desglose[0];
      if (base.confianza === "Sin dato") {
        assert.ok(/supuesto conservador/i.test(base.datos_entrada.fuente) && /supuesto/i.test(base.fundamento),
          "un paso 1 «Sin dato» que aporta puntos TIENE que decir por escrito que son un supuesto, no una medición");
      }

      /* 4 · INVARIANTE (2): la columna de aportes SUMA la cifra final. */
      const suma = Math.round(d.desglose.reduce((s, x) => s + x.aporte_pp, 0) * 100) / 100;
      assert.strictEqual(suma, d.probabilidad_final_pct,
        `los aportes suman ${suma} pp y la probabilidad final es ${d.probabilidad_final_pct} %`);
      assert.strictEqual(d.suma_aportes_pp, d.probabilidad_final_pct,
        "el campo `suma_aportes_pp` tiene que venir ya cuadrado con la cifra final");
      assert.strictEqual(Math.round(d.probabilidad_final * 1e4) / 100, d.probabilidad_final_pct,
        "la versión en fracción y la versión en porcentaje no describen el mismo número");

      /* 5 · INVARIANTE (1), la importante: es la MISMA cifra que enseña la app.
         Se comprueba sobre VARIOS procesos y no sobre uno: con uno solo podría
         coincidir por casualidad (media lista comparte entidad y factores). */
      for (const l of conId.slice(0, 6)) {
        const rr = await desgloseDe(`id_proceso=${encodeURIComponent(l.id_del_proceso)}`);
        assert.strictEqual(rr.status, 200, `sin desglose para ${l.id_del_proceso}`);
        assert.strictEqual(rr.cuerpo.probabilidad_final, l.p_ganar,
          `el desglose de ${l.id_del_proceso} dice ${rr.cuerpo.probabilidad_final} y la tarjeta ${l.p_ganar}`);
        assert.strictEqual(rr.cuerpo.contexto.valor_esperado_cop, l.ve,
          "el valor esperado del desglose no coincide con el de la tarjeta");
        const s2 = Math.round(rr.cuerpo.desglose.reduce((s, x) => s + x.aporte_pp, 0) * 100) / 100;
        assert.strictEqual(s2, rr.cuerpo.probabilidad_final_pct, "los aportes no cuadran en todos los procesos");
      }

      /* 5-bis · y no es un segundo cálculo: `desglosarProbabilidad` NARRA la
         traza de `trazaP`. Se comprueba contra `estimarPDetalle` —el contrato
         que consume la app— sobre el mismo proceso y el mismo contexto. */
      {
        const { desglosarProbabilidad, generarResumenEjecutivo } = require("../lib/probabilidad_desglose.js");
        const { estimarPDetalle, trazaP } = require("../lib/probabilidad.js");
        const { competenciaDe, leerIndice } = require("../lib/indice_competencia.js");
        const { leerIndiceBaja, bajaDeMercado } = require("../lib/indice_baja.js");
        const idx = await leerIndice(redis);
        const idxBaja = await leerIndiceBaja(redis);
        const lic = { entidad: muestra.entidad, departamento_entidad: muestra.departamento_entidad,
          codigo_principal_de_categoria: muestra.codigo_principal_de_categoria,
          modalidad_de_contratacion: muestra.modalidad_de_contratacion,
          precio_base: muestra.cuantia_cop, cuantia_cop: muestra.cuantia_cop,
          fecha_cierre: muestra.fecha_cierre, _cierre_prorrogado: false, _versiones: 1 };
        const ctx = { competencia: competenciaDe(idx, lic), baja: bajaDeMercado(idxBaja, lic), colision_cierres: 2 };
        const ref = estimarPDetalle(lic, ctx);
        const nar = desglosarProbabilidad(lic, idx, idxBaja, { colision_cierres: 2 });
        assert.strictEqual(nar.probabilidad_final, ref.p, "el desglose no reproduce a estimarPDetalle");
        assert.strictEqual(nar.rivales_esperados, ref.rivales_esperados);
        assert.strictEqual(nar.fuente_del_promedio, ref.fuente);
        // y `estimarPDetalle` sigue siendo exactamente la proyección de la traza
        const t = trazaP(lic, ctx);
        assert.deepStrictEqual(ref.ajustes, t.pasos.map(({ nombre, factor, motivo }) => ({ nombre, factor, motivo })),
          "estimarPDetalle y trazaP discrepan sobre los ajustes aplicados");
        assert.strictEqual(ref.p, Math.round(t.p * 1e4) / 1e4, "estimarPDetalle no publica la p de la traza");
        assert.strictEqual(ref.base, Math.round(t.base * 1e4) / 1e4);

        /* Un desglose sin ningún índice no puede reventar ni inventar: cae al
           supuesto conservador y dice «Sin dato» donde no sabe. */
        const pelado = desglosarProbabilidad({ entidad: "ENTIDAD QUE NO EXISTE" }, null, null, {});
        assert.strictEqual(pelado.fuente_del_promedio, "conservador");
        assert.strictEqual(pelado.suma_aportes_pp, pelado.probabilidad_final_pct);
        assert.ok(pelado.pasos.slice(1, 5).every((s) => s.confianza === "Sin dato" && s.aporte_pp === 0),
          "sin datos, los CUATRO AJUSTES tienen que decir «Sin dato» y aportar 0 pp");
        /* Y el paso 1 sigue aportando el supuesto conservador, que es
           1/(1+5) = 16,67 %: bajarlo a 0 pp no sería más honesto, sería dejar
           la probabilidad en cero — otro número inventado, y encima el que peor
           decisión provoca (descartar la oportunidad). */
        assert.strictEqual(pelado.pasos[0].confianza, "Sin dato");
        assert.strictEqual(pelado.pasos[0].aporte_pp, 16.67,
          "sin ningún histórico, la base tiene que ser el supuesto conservador 1/(1+5), no un cero");
        assert.strictEqual(pelado.probabilidad_final, 0.1667);

        /* El resumen ejecutivo es un informe, no una especulación: nada de
           «podría», «probablemente» ni «se estima que». */
        const resumen = generarResumenEjecutivo(nar, 3200000);
        assert.ok(resumen.split("\n").length >= 3, "el resumen ejecutivo debe tener al menos 3 líneas");
        for (const prohibida of [/podr[ií]a/i, /probablemente/i, /se estima que/i, /quiz[aá]/i, /tal vez/i]) {
          assert.ok(!prohibida.test(resumen), `el resumen ejecutivo especula: «${resumen}»`);
        }
        assert.ok(/\$3\.200\.000/.test(resumen), "el resumen debe citar el costo de preparación recibido");
        // sin costo NO se inventa una cifra en pesos
        const sinCosto = generarResumenEjecutivo(nar, null);
        assert.ok(!/\$/.test(sinCosto.split("\n").pop()),
          "sin costo de preparación no se puede inventar una cifra en pesos");
      }

      /* 6 · resumen ejecutivo y texto para copiar viajan en la respuesta */
      assert.ok(typeof d.resumen_ejecutivo === "string" && d.resumen_ejecutivo.split("\n").length >= 3,
        "el endpoint no devolvió un resumen ejecutivo de al menos 3 líneas");
      assert.ok(/PROBABILIDAD DE ADJUDICACIÓN/.test(d.justificacion_texto),
        "falta el texto plano que copia el botón «Copiar justificación»");
      assert.ok(d.justificacion_texto.includes(d.resumen_ejecutivo),
        "el texto para copiar tiene que llevar dentro el mismo resumen que se pinta: dos textos distintos serían dos verdades");

      /* 7 · caché de 300 s, y su sello. El costo de preparación entra en el
         sello a propósito: servir desde caché el resumen calculado con OTRO
         costo sería recomendar sobre una cifra que nadie pidió. */
      assert.strictEqual(d.cache, false, "la primera consulta no puede venir de caché");
      const rep = await desgloseDe(`id_proceso=${encodeURIComponent(muestra.id_del_proceso)}`);
      assert.strictEqual(rep.cuerpo.cache, true, "la segunda consulta idéntica tiene que servirse desde caché");
      const refresca = await invocar(detalleComp,
        `/api/competencia-detalle?vista=probabilidad&refrescar=1&id_proceso=${encodeURIComponent(muestra.id_del_proceso)}`, CAB_TOKEN);
      assert.strictEqual(refresca.cuerpo.cache, false, "?refrescar=1 tiene que saltarse la caché");
      const conCosto = await desgloseDe(`id_proceso=${encodeURIComponent(muestra.id_del_proceso)}&costo_preparacion=3200000`);
      assert.strictEqual(conCosto.cuerpo.cache, false, "otro costo de preparación no puede resolverse con la caché del anterior");
      assert.strictEqual(conCosto.cuerpo.contexto.costo_preparacion_cop, 3200000);
      assert.ok(/\$3\.200\.000/.test(conCosto.cuerpo.resumen_ejecutivo), "el costo recibido no llegó al resumen");
      assert.strictEqual(conCosto.cuerpo.probabilidad_final, d.probabilidad_final,
        "el costo de preparación no puede mover la probabilidad: es un umbral de decisión, no una entrada del cálculo");

      /* 8 · LA VISTA POR DEFECTO NO CAMBIÓ. El endpoint de entidad es el que ya
         estaba y plegar el desglose dentro no puede haberlo movido. */
      const porEntidad = await invocar(detalleComp,
        "/api/competencia-detalle?entidad=ALCALDÍA DE PURIFICACIÓN", CAB_TOKEN);
      assert.strictEqual(porEntidad.status, 200, "la vista de entidad dejó de responder");
      assert.ok(porEntidad.cuerpo.indice, "la vista de entidad ya no devuelve su índice");

      /* 9 · EL ALIAS. `/api/probabilidad-desglose` es la URL del encargo y no
         puede ser una función propia: el plan Hobby admite 12 y el repositorio
         está en 12. Vive como rewrite, y hay que comprobar las dos mitades:
         que vercel.json apunte al endpoint real CON la vista correcta, y que el
         handler resuelva esa vista también por el PATH — un handler que solo
         funciona detrás del enrutador es un handler que no se puede probar. */
      {
        const vc = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
        const alias = (vc.rewrites || []).find((x) => x.source === "/api/probabilidad-desglose");
        assert.ok(alias, "vercel.json no declara el alias /api/probabilidad-desglose");
        assert.strictEqual(alias.destination, "/api/competencia-detalle?vista=probabilidad",
          "el alias tiene que apuntar al endpoint real CON la vista: un alias que apunta a otra cosa promete algo que no hace");
        assert.ok(fs.existsSync(path.join(__dirname, "..", "api", "competencia-detalle.js")),
          "el alias apunta a un archivo que no existe");
        // el mismo handler, invocado por el path del alias y SIN `vista` en la query
        const porPath = await invocar(detalleComp,
          `/api/probabilidad-desglose?id_proceso=${encodeURIComponent(muestra.id_del_proceso)}`, CAB_TOKEN);
        assert.strictEqual(porPath.status, 200, "el desglose no se resuelve por el path del alias");
        assert.strictEqual(porPath.cuerpo.probabilidad_final, d.probabilidad_final,
          "el alias y la ruta canónica tienen que dar la misma cifra");
      }

      /* 10 · CABLEADO DEL FRONTEND. No hay DOM en esta suite, así que esto
         vigila el marcado y las llamadas, no el comportamiento visual — y se
         presenta como lo que es. */
      {
        const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
        const js = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
        const jsSinComentarios = sinComentarios(js);
        for (const id of ["modal-rotulo", "modal-copiar"]) {
          assert.ok(html.includes(`id="${id}"`), `falta #${id} en index.html`);
        }
        assert.ok(/class="hidden[^"]*"[^>]*id="modal-copiar"|id="modal-copiar"[\s\S]{0,200}?hidden|hidden[\s\S]{0,200}?id="modal-copiar"/.test(html),
          "el botón de copiar tiene que nacer oculto: solo aparece en el desglose y cuando hay algo que copiar");
        assert.ok(jsSinComentarios.includes("detalle-probabilidad"),
          "«Prob. estimada» no es clicable: falta la clase del disparador");
        assert.ok(/decoration-dotted/.test(jsSinComentarios),
          "el subrayado punteado es lo que anuncia que la cifra se puede pulsar");
        /* LLAMA A LA CANÓNICA, no al alias: el alias es un rewrite y, si
           fallara, el modal tiene que seguir funcionando. Misma lección que
           /api/admin/cargar-experiencia-genesis. */
        assert.ok(jsSinComentarios.includes("/api/competencia-detalle?vista=probabilidad&id_proceso="),
          "el modal tiene que llamar a la ruta canónica, no al alias del rewrite");
        assert.ok(!/fetch\(\s*[`"']\/api\/probabilidad-desglose/.test(jsSinComentarios),
          "el frontend no puede depender del rewrite para funcionar");
        // el token viaja por cabecera, NUNCA en la URL (historial y logs de acceso)
        assert.ok(!/vista=probabilidad[^`"']*token=/.test(jsSinComentarios),
          "el token no puede viajar en la URL del desglose");
        /* Y la misma prohibición que ya vigila los conteos: un `|| 0` sobre un
           aporte convertiría «no sé» en «cero» y lo haría creíble. */
        assert.ok(!/\.aporte_pp\s*\|\|\s*0/.test(jsSinComentarios),
          "un `|| 0` sobre el aporte convierte «sin dato» en «cero»");
      }

      const conf = d.desglose.map((s) => s.confianza);
      console.log(`  · desglose de P(ganar): ${d.probabilidad_final_pct} % en ${d.desglose.length} pasos `
        + `(Σ aportes ${d.suma_aportes_pp} pp ≡ la cifra) · confianza ${conf.filter((c) => c === "Alta").length}A/`
        + `${conf.filter((c) => c === "Media").length}M/${conf.filter((c) => c === "Baja").length}B/`
        + `${conf.filter((c) => c === "Sin dato").length}sin · alias, caché y cableado verificados`);
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
        duracion: "5", unidad_de_duracion: "Meses",
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

      /* ── columnas_historicas: el censo no puede contradecir a quien lee ──
         El censo y el índice de competencia recorren el MISMO corpus con las
         MISMAS listas de candidatas (lib/columnas_historicas las importa de
         lib/indice_competencia, no las copia). Si discreparan sobre si una
         columna existe, el diagnóstico no serviría para diagnosticar: diría que
         hay una columna que el índice no mira, o al revés. */
      const ch = c.columnas_historicas;
      assert.ok(ch && !ch.error, `el censo de columnas falló: ${ch && ch.error}`);
      assert.ok(ch.corpus.procesos_unicos > 0, "el censo no ve el corpus histórico");

      for (const [id, g] of Object.entries(ch.grupos)) {
        // «útil» (número > 0) es un subconjunto de «presente»: un campo en cero
        // es SIN DATO, y las dos cifras existen para que no se confundan
        assert.ok(g.con_dato_util <= g.con_dato,
          `${id}: ${g.con_dato_util} útiles sobre ${g.con_dato} presentes`);
        assert.ok(g.con_dato <= ch.corpus.procesos_unicos,
          `${id}: más filas con dato que procesos en el corpus`);
        // el campo efectivo es el PRIMER candidato con datos, en el mismo orden
        // en que `primero()` los resuelve — que es el que el índice acabará leyendo
        const primerConDatos = Object.entries(g.candidatas).find(([, s]) => s.utiles > 0);
        assert.strictEqual(g.campo_efectivo, primerConDatos ? primerConDatos[0] : null,
          `${id}: campo_efectivo no es el primer candidato con datos`);
        for (const [nombre, s] of Object.entries(g.candidatas)) {
          assert.ok(s.muestra.length <= 3, `${id}.${nombre}: muestra de más de 3 valores`);
          assert.ok(s.utiles === 0 || s.muestra.length > 0,
            `${id}.${nombre}: ${s.utiles} valores útiles y ninguna muestra que enseñar`);
        }
        // `claves_observadas` es la verdad literal del JSON guardado: si un
        // campo es el efectivo, tiene que estar ahí
        if (g.campo_efectivo) {
          assert.ok(ch.claves_observadas[g.campo_efectivo] > 0,
            `${g.campo_efectivo} es campo_efectivo pero no aparece en claves_observadas`);
        }
      }

      /* LA INVARIANTE QUE IMPORTA: si el índice clasificó entidades es porque
         leyó oferentes, así que el censo TIENE que ver esa misma columna. */
      const idxMeta = JSON.parse((await redis.get(CLAVES.indiceMeta)) || "null");
      if (idxMeta && idxMeta.clasificadas > 0) {
        assert.ok(ch.conclusion.campo_numero_ofertas,
          `el índice clasificó ${idxMeta.clasificadas} entidades pero el censo no ve columna de oferentes`);
        assert.ok(ch.grupos.numero_ofertas.con_dato_util > 0,
          "el índice leyó oferentes y el censo cuenta cero");
      }

      /* La baja exige las DOS mitades en la MISMA fila: el veredicto no puede
         afirmar que se puede calcular si no hay ni un par completo. */
      assert.ok(ch.baja_de_mercado.procesos_con_par_completo <= ch.corpus.procesos_unicos,
        "más pares completos que procesos en el corpus");
      assert.strictEqual(ch.conclusion.se_puede_calcular_baja,
        ch.baja_de_mercado.procesos_con_par_completo > 0,
        "el veredicto de la baja no coincide con los pares realmente contados");
      assert.ok(ch.conclusion.veredicto && ch.conclusion.siguiente_paso,
        "el censo debe decir en castellano qué pasa y cuál es el siguiente paso");

      /* ── baja_de_mercado: el bloque existe y su reparto CUADRA ──
         `cobertura_visibles_por_granularidad` describe el conjunto visible, así
         que tiene que sumarlo exacto — misma regla que el reparto por tier y por
         pertinencia. `sin_dato` es una cubeta más justamente para eso. */
      const bm = c.baja_de_mercado;
      assert.ok(bm, "el diagnóstico no publica el bloque baja_de_mercado");
      assert.strictEqual(bm.min_procesos, 5, "el mínimo del índice de baja debe viajar");
      const sumaGran = Object.values(bm.cobertura_visibles_por_granularidad).reduce((a, b) => a + b, 0);
      assert.strictEqual(sumaGran, c.embudo.visibles,
        `el reparto por granularidad (${sumaGran}) debe sumar los visibles (${c.embudo.visibles})`);
      const sumaNiv = Object.values(bm.entidades_por_nivel).reduce((a, b) => a + b, 0);
      assert.strictEqual(sumaNiv, bm.entidades, "el reparto por nivel debe sumar las entidades del índice");
      // ningún ejemplo puede llevar cifra sin base: es la misma invariante del badge
      for (const e of [...bm.ejemplos_baja_alta, ...bm.ejemplos_baja_baja]) {
        assert.ok(e.procesos >= bm.min_procesos && e.nivel !== "sin_dato" && e.baja_mediana != null,
          `ejemplo con cifra sin base: ${JSON.stringify(e)}`);
      }

      /* El VEREDICTO no puede contradecir a las cifras que lo acompañan. Es la
         trampa de `i.total_procesos`: `grupos.*.utiles` no existe en el objeto
         publicado (se llama `con_dato_util`), y leerlo daba `undefined > 0` =
         false, así que el texto anunciaba «ninguna candidata trae datos» encima
         de un campo_efectivo resuelto y una baja ya calculada. */
      assert.strictEqual(ch.conclusion.existe_valor_adjudicado,
        ch.grupos.valor_adjudicado.campo_efectivo != null,
        "existe_valor_adjudicado no coincide con el campo efectivo resuelto");
      assert.strictEqual(ch.conclusion.campo_valor_adjudicado,
        ch.grupos.valor_adjudicado.campo_efectivo,
        "la conclusión y el grupo nombran columnas distintas");
      if (ch.grupos.valor_adjudicado.con_dato_util > 0) {
        assert.ok(ch.conclusion.existe_valor_adjudicado,
          `hay ${ch.grupos.valor_adjudicado.con_dato_util} valores adjudicados y el veredicto dice que no existen`);
        assert.ok(!/Ninguna de las/.test(ch.conclusion.veredicto),
          `el veredicto niega el valor adjudicado que él mismo contó: ${ch.conclusion.veredicto}`);
      }
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

      /* ---- CARGA DESDE EL REPOSITORIO (?origen=repositorio) ----
         El dueño no tiene terminal: `cargar_experiencia.sh` no le sirve y el
         panel tiene que poder cargar los 106 contratos de Génesis con un clic.
         La tentación era un endpoint nuevo, y habría roto el DESPLIEGUE ENTERO
         (12 funciones es el tope del plan Hobby y el repositorio está en 12), así
         que vive en ESTE endpoint como una fuente distinta de los contratos.
         Lo que hay que probar no es que «funcione», sino que sea EL MISMO camino
         que la carga manual: si fueran dos, divergirían. */
      {
        const archivoRepo = path.join(__dirname, "..", "experiencia_genesis_106.json");
        const delRepo = JSON.parse(fs.readFileSync(archivoRepo, "utf8"));

        /* protegido igual que el resto: el origen no puede ser una puerta trasera */
        assert.strictEqual(
          (await invocarPost(experiencia, "/api/admin/experiencia?origen=repositorio", null)).status, 401,
          "?origen=repositorio tiene que exigir token como cualquier otra carga");

        /* SIN CUERPO: es lo que permite dispararlo con un botón (y con el
           rewrite) sin fabricar un JSON que el servidor ya tiene */
        const r = await invocarPost(experiencia, "/api/admin/experiencia?origen=repositorio", null, CAB_TOKEN);
        assert.strictEqual(r.status, 200, `la carga desde el repositorio falló: ${JSON.stringify(r.cuerpo).slice(0, 300)}`);
        assert.strictEqual(r.cuerpo.ok, true);
        assert.strictEqual(r.cuerpo.origen, "repositorio",
          "la respuesta tiene que declarar de dónde salieron los contratos: dos orígenes, dos respuestas distinguibles");
        assert.strictEqual(r.cuerpo.archivo, "experiencia_genesis_106.json");

        /* ATA la respuesta al ARCHIVO REAL del repositorio. Sin esto, el
           endpoint podría estar leyendo otra cosa —o una copia rancia— y la
           prueba pasaría igual. */
        assert.strictEqual(r.cuerpo.contratos_cargados, delRepo.contratos.length,
          "el endpoint no cargó exactamente los contratos del archivo versionado");
        assert.ok(r.cuerpo.terminos_extraidos > 0, "sin vocabulario la carga no sirve para nada");
        assert.ok(r.cuerpo.version && r.cuerpo.cargado, "la carga desde el repositorio también sella");
        assert.ok(/repositorio/i.test(r.cuerpo.nota || ""),
          "la nota debe decir que vino del repositorio, no repetir la de la carga manual");

        /* EL ALIAS PEGADO EN CHROME ES UN **GET**, y esa es la vía de disparo
           documentada del dueño (no tiene terminal). Antes la rama GET retornaba
           ANTES de mirar el origen y respondía `200 {ok:true, cargada:false,
           contratos_cargados:0}`: un «no hice nada» con cara de éxito, con un
           cero que además se lee como «cargué cero contratos». Misma familia que
           «en 0 procesos» y que un `|| 0` sobre un conteo. Ahora es un 405 que
           dice cómo hacerlo de verdad. */
        {
          const getAlias = await invocar(experiencia, "/api/admin/experiencia?origen=repositorio", CAB_TOKEN);
          assert.strictEqual(getAlias.status, 405,
            "un GET al alias no puede responder 200 ok:true sin haber cargado nada");
          assert.strictEqual(getAlias.cabeceras.allow, "POST", "un 405 tiene que decir qué método sí vale");
          assert.strictEqual(getAlias.cuerpo.ok, false);
          assert.ok(/admin\.html|Cargar Experiencia/i.test(getAlias.cuerpo.como_hacerlo || ""),
            "el 405 tiene que decir CÓMO hacerlo: quien pegó la URL no tiene terminal para averiguarlo");
          // y no puede haber escrito nada por el camino
          const trasGet = await invocar(experiencia, "/api/admin/experiencia", CAB_TOKEN);
          assert.strictEqual(trasGet.cuerpo.contratos_cargados, delRepo.contratos.length,
            "el GET rechazado no puede haber tocado lo guardado");
        }

        /* Un `origen` mal escrito NO puede caer en silencio en la rama del
           cuerpo y cargar otra cosa: cae en el 400 de «body vacío», que es
           ruidoso. Por eso el flag va en la QUERY y no en el cuerpo — el
           validador ignora las claves extra de la raíz, así que un flag mal
           escrito DENTRO del JSON cargaría los contratos pegados con un 200
           idéntico: fuente equivocada y sin síntoma. */
        {
          const malEscrito = await invocarPost(experiencia, "/api/admin/experiencia?origen=repo", null, CAB_TOKEN);
          assert.strictEqual(malEscrito.status, 400,
            "un origen desconocido tiene que fallar ruidosamente, no cargar el cuerpo en silencio");
          assert.strictEqual(malEscrito.cuerpo.origen, "cuerpo");
        }

        /* y queda REALMENTE guardado: el GET lo ve */
        const g = await invocar(experiencia, "/api/admin/experiencia", CAB_TOKEN);
        assert.strictEqual(g.cuerpo.cargada, true);
        assert.strictEqual(g.cuerpo.contratos_cargados, delRepo.contratos.length);
        assert.strictEqual(g.cuerpo.contratos[0].objeto, delRepo.contratos[0].objeto,
          "lo guardado no coincide con el primer contrato del archivo del repositorio");

        /* EL MISMO VALIDADOR: el archivo versionado pasa el validador del
           proyecto. Si algún día dejara de pasarlo, el 400 lo diría con `nota`
           y esta prueba lo caza antes de que llegue a producción. */
        const val = require("../lib/experiencia.js").validarContratos(delRepo);
        assert.strictEqual(val.ok, true,
          `experiencia_genesis_106.json no pasa validarContratos: ${JSON.stringify((val.errores || []).slice(0, 3))}`);

        /* LOS DOS PRIMEROS PASOS DEL PANEL, ENCADENADOS DE VERDAD. Es el
           entregable: cargar los 106 y auditar Génesis con ELLOS. Probados por
           separado, el encadenado solo estaría verificado por regex sobre el
           fuente del frontend — y lo que el dueño va a pulsar es la cadena. */
        {
          const aud = await invocar(coberturaApi,
            "/api/admin/cobertura-rup?perfil=genesis&refrescar=1", CAB_TOKEN);
          assert.strictEqual(aud.status, 200, "la auditoría tras cargar del repositorio falló");
          assert.strictEqual(aud.cuerpo.experiencia_utilizada, true,
            "tras cargar los 106 contratos la auditoría tiene que usarlos, no caer al método base");
          assert.strictEqual(aud.cuerpo.contratos_experiencia, delRepo.contratos.length,
            "la auditoría no midió contra los 106 contratos recién cargados");
        }

        /* COMPATIBILIDAD (punto 4 del encargo): la carga manual sigue viva y
           manda. Se restaura además el fixture, que es lo que esperan las
           pruebas de abajo. */
        const manual = await invocarPost(experiencia, "/api/admin/experiencia",
          { contratos: CONTRATOS_EXPERIENCIA }, CAB_TOKEN);
        assert.strictEqual(manual.status, 200, "la carga manual dejó de funcionar");
        assert.strictEqual(manual.cuerpo.origen, "cuerpo",
          "la carga manual tiene que declararse como tal");
        assert.strictEqual(manual.cuerpo.archivo, undefined,
          "una carga manual no viene de ningún archivo del repositorio: el campo no puede aparecer");
        assert.strictEqual(manual.cuerpo.contratos_cargados, CONTRATOS_EXPERIENCIA.length,
          "la carga manual no reemplazó a la del repositorio");
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

    /* ═══ g-quinquies. Onboarding: RUP en PDF → perfil dinámico → dashboard ═══
       El PDF se lee en el navegador (public/onboarding.js); aquí se ejercita lo
       que ve el servidor: POST /api/admin/rup?origen=pdf SIN token (la única
       escritura pública del repositorio, con TTL y tope de perfiles como
       cerraduras), la extracción de lib/rup_pdf sobre un certificado sintético,
       y que /api/oportunidades?perfil=rup_… sirva ese perfil SIN tocar los tres
       del dueño. Los errores tienen que ser accionables: son para un
       contratista anónimo que no tiene a quién preguntarle. */
    {
      const perfilDinamico = require("../lib/perfil_dinamico.js");
      const anoActual = new Date().getFullYear();
      // renovación en el año en curso: `verificar_vigencia` no puede depender
      // de cuándo corra la suite (una prueba calibrada contra el reloj real
      // falla sola en la frontera — la lección del «ahora» inyectado)
      const TEXTO_RUP = [
        "CAMARA DE COMERCIO DE IBAGUE",
        "CERTIFICADO DEL REGISTRO UNICO DE PROPONENTES - RUP",
        "RAZON SOCIAL: CONSTRUCTORA DEL SUR S.A.S.",
        "NIT: 901234567-8",
        "TELEFONO 3123456789",
        "FECHA DE INSCRIPCION: 15/04/2020",
        `FECHA DE ULTIMA RENOVACION: 10/04/${anoActual}`,
        "INFORMACION FINANCIERA A 31 DE DICIEMBRE DE 2025",
        "INDICE DE LIQUIDEZ\t3,25",
        "INDICE DE ENDEUDAMIENTO\t35,00%",
        "RAZON DE COBERTURA DE INTERESES\t8,40",
        "PATRIMONIO\t$ 850.000.000",
        "UTILIDAD OPERACIONAL\t$ 120.000.000",
        "CODIGO INTERNO 20240315",
        "EXPERIENCIA",
        "CONTRATO\tOBJETO\tVALOR SMMLV",
        "1\tCONSTRUCCION DE PLACA HUELLA\t1.250,50 SMMLV",
        "2\tMANTENIMIENTO VIA TERCIARIA\t2.480,00 SMMLV",
        "CLASIFICACION DE BIENES Y SERVICIOS - UNSPSC",
        "SEGMENTO\tFAMILIA\tCLASE\tPRODUCTO",
        "72\t14\t10\t00",
        "72\t15\t41\t00",
        "81\t10\t15\t00",
        "F-72141100",
      ].join("\n");

      /* 1 · pegar el alias en Chrome es un GET → 405 con instrucciones, jamás
         un «GET que escribe» (misma regla que cargar-experiencia-genesis) */
      {
        const r = await invocar(adminRup, "/api/admin/rup?origen=pdf");
        assert.strictEqual(r.status, 405, "GET de la vía PDF debía ser 405");
        assert.strictEqual(r.cabeceras.allow, "POST");
        assert.ok(r.cuerpo.como_hacerlo, "el 405 debe decir cómo hacerlo de verdad");
      }

      /* 2 · POST SIN token → 200 con el contrato del encargo:
         { perfil_id, unspsc_count, k, vigencia, resumen } */
      const r = await invocarPost(adminRup, "/api/admin/rup?origen=pdf",
        { texto_extraido: TEXTO_RUP, nombre_archivo: "rup.pdf" });
      assert.strictEqual(r.status, 200, `la carga por PDF falló: ${JSON.stringify(r.cuerpo).slice(0, 400)}`);
      assert.ok(/^rup_[a-z0-9]+$/.test(r.cuerpo.perfil_id), `perfil_id inesperado: ${r.cuerpo.perfil_id}`);
      assert.strictEqual(r.cuerpo.unspsc_count, 4, "debía leer 4 códigos (2 por pares, 1 de 8 dígitos, 1 con prefijo F-)");
      assert.ok(r.cuerpo.k > 0, "la K estimada debe ser positiva");
      assert.strictEqual(r.cuerpo.vigencia.fecha_inscripcion, "2020-04-15");
      assert.strictEqual(r.cuerpo.vigencia.fecha_renovacion, `${anoActual}-04-10`);
      assert.strictEqual(r.cuerpo.vigencia.verificar_vigencia, false);
      assert.strictEqual(r.cuerpo.resumen.nombre, "CONSTRUCTORA DEL SUR S.A.S.");
      assert.strictEqual(r.cuerpo.resumen.tipo, "persona_juridica");
      assert.strictEqual(r.cuerpo.resumen.nit, "901234567-8");
      assert.strictEqual(r.cuerpo.resumen.indicadores.liquidez, 3.25);
      assert.strictEqual(r.cuerpo.resumen.indicadores.endeudamiento, 0.35, "«35,00%» debía interpretarse como 0,35");
      assert.strictEqual(r.cuerpo.resumen.indicadores.patrimonio, 850000000);
      assert.strictEqual(r.cuerpo.resumen.experiencia_smmlv, 2480, "la experiencia es el MAYOR contrato en SMMLV");
      assert.deepStrictEqual(
        [r.cuerpo.resumen.clases, r.cuerpo.resumen.familias, r.cuerpo.resumen.segmentos], [4, 3, 2],
        "las whitelists derivadas no cuadran con los 4 códigos");
      // el run «20240315» (fuera de sección, no termina en 00) se DESCARTA y SE CUENTA
      assert.ok(r.cuerpo.diagnostico.codigos_ilegibles >= 1, "el run que no es código debía contarse como ilegible");
      // los dos supuestos van DECLARADOS: profesionales=1 y tope=2×experiencia
      assert.ok(r.cuerpo.advertencias.some((a) => /profesionales/.test(a)), "falta la advertencia de profesionales");
      assert.strictEqual(r.cuerpo.resumen.tope_smmlv, 4960, "tope por defecto = 2 × mayor contrato acreditado");
      const id = r.cuerpo.perfil_id;

      /* 3 · guardado con TTL de verdad, sin tocar el sello de los tres perfiles */
      {
        const ttl = await redis.ttl(`config:perfiles:${id}`);
        assert.ok(ttl > 0 && ttl <= 45 * 24 * 3600, `el perfil dinámico se guardó sin TTL (ttl=${ttl})`);
        const ttlU = await redis.ttl(`config:unspsc:${id}:completo`);
        assert.ok(ttlU > 0, "las whitelists del perfil dinámico deben caducar con él");
        assert.strictEqual(await redis.get(CLAVES.configPerfilesVersion), null,
          "la carga por PDF no puede escribir el sello global: haría recargar los perfiles del dueño");
      }

      /* 4 · la app SIRVE el perfil dinámico: sin token, con las finanzas
         redactadas (lib/publico aplica igual que a los perfiles del dueño) */
      {
        const op = await invocar(oportunidades, `/api/oportunidades?perfil=${id}&por_pagina=100`);
        assert.strictEqual(op.status, 200, `la consulta con el perfil dinámico falló: ${JSON.stringify(op.cuerpo).slice(0, 300)}`);
        assert.ok(op.cuerpo.total > 0, "el RUP subido incluye 72141000 y debía ver las placas huella del corpus");
        assert.strictEqual(op.cuerpo.finanzas_visibles, false, "sin token las finanzas no pueden declararse visibles");
        assert.ok(op.cuerpo.resultados.some((l) => /placa huella/i.test(l.nombre_del_procedimiento || "") && l.rup.tier === "clase"),
          "la placa huella debía casar por CLASE con el 72141000 del RUP subido");
        assert.ok(!op.cuerpo.resultados.some((l) => /salud ocupacional/i.test(l.nombre_del_procedimiento || "")),
          "salud ocupacional (85101500) NO está en el RUP subido y no debía servirse");
        for (const l of op.cuerpo.resultados) {
          assert.strictEqual(l.rup.k_cop, null, "sin token, la K del perfil dinámico también viaja redactada");
        }
        // …y con token las cifras vuelven, como en cualquier perfil
        const conTok = await invocar(oportunidades, `/api/oportunidades?perfil=${id}&por_pagina=1`, CAB_TOKEN);
        assert.ok(conTok.cuerpo.resultados[0].rup.k_cop > 0, "con token la K del perfil dinámico debe viajar");
      }

      /* 5 · los tres perfiles del dueño NO se tocan */
      {
        assert.strictEqual(PERFILES.helder.nombre, perfilesMod.PERFILES_FALLBACK.helder.nombre,
          "la carga por PDF pisó el perfil de Helder");
        const oh = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1", CAB_TOKEN);
        assert.strictEqual(oh.status, 200);
        assert.ok(oh.cuerpo.total > 0, "helder dejó de ver oportunidades tras una carga dinámica ajena");
      }

      /* 6 · errores ACCIONABLES */
      {
        // perfil dinámico inexistente → 404 con `perfil_caducado` (la web lo
        // usa para olvidar el perfil guardado y mandar al onboarding)
        const nf = await invocar(oportunidades, "/api/oportunidades?perfil=rup_noexiste99");
        assert.strictEqual(nf.status, 404, "un rup_ inexistente debía ser 404, no un 400 genérico");
        assert.strictEqual(nf.cuerpo.perfil_caducado, true);
        // id con formato inválido → 400 (ni viaje a Redis ni 404 confuso)
        assert.strictEqual((await invocar(oportunidades, "/api/oportunidades?perfil=rup_x!")).status, 400);
        // texto sin códigos → el mensaje del encargo, con qué verificar
        const malo = await invocarPost(adminRup, "/api/admin/rup?origen=pdf",
          { texto_extraido: "ACTA DE REUNION ORDINARIA DEL CONSEJO DIRECTIVO. ".repeat(10) });
        assert.strictEqual(malo.status, 400);
        assert.ok(/UNSPSC/.test(malo.cuerpo.error) && /RUP\s+vigente/i.test(malo.cuerpo.error),
          `el error debe decir qué verificar: ${malo.cuerpo.error}`);
        // sin texto_extraido → 400 que explica el contrato (el servidor no lee PDF binario)
        const sinTexto = await invocarPost(adminRup, "/api/admin/rup?origen=pdf", { pdf_base64: "JVBERi0..." });
        assert.strictEqual(sinTexto.status, 400);
        assert.ok(/texto_extraido/.test(sinTexto.cuerpo.error));
      }

      /* 7 · utilidad DERIVADA de la rentabilidad del patrimonio (identidad del
         D. 1082, no un invento) — y declarada en advertencias */
      {
        const t2 = [
          "REGISTRO UNICO DE PROPONENTES",
          "RAZON SOCIAL: OBRAS DEL NORTE LTDA",
          "INDICE DE LIQUIDEZ: 2,10",
          "INDICE DE ENDEUDAMIENTO: 0,40",
          "RENTABILIDAD DEL PATRIMONIO: 14,12%",
          "PATRIMONIO: 500.000.000",
          "EXPERIENCIA: MAYOR CONTRATO 1.000 SMMLV",
          "CLASIFICACION DE BIENES Y SERVICIOS",
          "72141000",
          "RELLENO PARA QUE EL TEXTO SUPERE EL MINIMO DEL EXTRACTOR ".repeat(5),
        ].join("\n");
        const rd = await invocarPost(adminRup, "/api/admin/rup?origen=pdf", { texto_extraido: t2 });
        assert.strictEqual(rd.status, 200, `la utilidad derivada falló: ${JSON.stringify(rd.cuerpo).slice(0, 300)}`);
        assert.strictEqual(rd.cuerpo.resumen.indicadores.utilidad_operacional, 70600000,
          "utilidad derivada = rentabilidad × patrimonio (0,1412 × 500 M)");
        assert.ok(rd.cuerpo.advertencias.some((a) => /deriv/i.test(a)), "la derivación tiene que declararse");
        assert.ok(rd.cuerpo.diagnostico.utilidad_derivada === true);
      }

      /* 7-bis · dos contaminaciones que la revisión adversaria encontró y que
         producían cifras equivocadas y CREÍBLES (lo peor que puede salir de
         aquí): la fecha de corte contable pegada a la etiqueta se leía como el
         valor del indicador, y un año en la línea de experiencia se volvía la
         experiencia acreditada (el máximo de la línea era 2023 «SMMLV»). */
      {
        const { extraerRupDeTexto } = require("../lib/rup_pdf.js");
        const t3 = [
          "REGISTRO UNICO DE PROPONENTES",
          "RAZON SOCIAL: PRUEBA SAS",
          "INDICE DE LIQUIDEZ: 1,80",
          "INDICE DE ENDEUDAMIENTO: 0,30",
          "PATRIMONIO A 31/12/2025\t$ 850.000.000",
          "UTILIDAD OPERACIONAL A 31/12/2025\t$ 90.000.000",
          "CONTRATO EJECUTADO EN 2023\t900,00 SMMLV",
          "CLASIFICACION DE BIENES Y SERVICIOS",
          "72141000",
          "RELLENO PARA SUPERAR EL MINIMO DE CARACTERES DEL EXTRACTOR ".repeat(5),
        ].join("\n");
        const r3 = extraerRupDeTexto(t3);
        assert.strictEqual(r3.ok, true, `extracción con fechas en línea falló: ${JSON.stringify(r3).slice(0, 300)}`);
        assert.strictEqual(r3.config.indicadores.patrimonio, 850000000,
          "la fecha de corte «A 31/12/2025» no puede leerse como patrimonio de $31");
        assert.strictEqual(r3.config.indicadores.utilidad_operacional, 90000000);
        assert.strictEqual(r3.config.experiencia_smmlv, 900,
          "el año 2023 de la línea no puede volverse la experiencia: la cifra es la ADYACENTE a «SMMLV»");
      }

      /* 8 · experiencia: el campo `unspsc` OPCIONAL del formato CSV, sin romper
         la forma de los contratos ya guardados */
      {
        const exp = require("../lib/experiencia.js");
        const base = { objeto: "Construcción de placa huella vereda El Placer", valor_cop: "350.000.000", entidad: "ALCALDIA", fecha_inicio: "15/01/2023", fecha_fin: "20/08/2023" };
        const v1 = exp.validarContratos({ contratos: [{ ...base, unspsc: "72141000" }] });
        assert.strictEqual(v1.ok, true, `contrato con unspsc rechazado: ${JSON.stringify(v1.errores)}`);
        assert.strictEqual(v1.contratos[0].unspsc, "72141000");
        const v2 = exp.validarContratos({ contratos: [{ ...base, unspsc: "123" }] });
        assert.strictEqual(v2.ok, false, "un unspsc de 3 dígitos debía rechazarse");
        assert.ok(v2.errores.some((e) => e.campo === "contratos[0].unspsc"), "el error debe nombrar el campo");
        const v3 = exp.validarContratos({ contratos: [base] });
        assert.strictEqual(v3.ok, true);
        assert.ok(!("unspsc" in v3.contratos[0]),
          "sin unspsc la clave NO se escribe: los contratos del esquema anterior conservan su forma exacta");
      }

      /* 9 · el formato CSV publicado pasa su propio validador (las filas de
         ejemplo no pueden estar rotas: son lo primero que el usuario copia) */
      {
        const exp = require("../lib/experiencia.js");
        const csv = fs.readFileSync(path.join(__dirname, "..", "public", "formato_experiencia.csv"), "utf8");
        assert.ok(/OPCIONAL/i.test(csv), "el CSV debe declarar en sus comentarios que es opcional");
        const utiles = csv.split(/\r\n|\r|\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
        assert.strictEqual(utiles[0], "objeto,valor_cop,fecha_inicio,fecha_fin,entidad,unspsc",
          "la cabecera del formato cambió: rompería la conversión del onboarding");
        const contratos = utiles.slice(1).map((l) => {
          const [objeto, valor_cop, fecha_inicio, fecha_fin, entidad, unspsc] = l.split(",");
          return { objeto, valor_cop, fecha_inicio, fecha_fin, entidad, ...(unspsc ? { unspsc } : {}) };
        });
        const v = exp.validarContratos({ contratos });
        assert.strictEqual(v.ok, true, `las filas de ejemplo no pasan el validador: ${JSON.stringify(v.errores)}`);
        assert.strictEqual(v.contratos[0].unspsc, "72141000");
      }

      /* 10 · cableado del frontend (sin DOM: marcado y llamadas, no
         comportamiento visual — y se presenta como lo que es) */
      {
        const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
        /* «Cargar experiencia laboral» vive desde ago 2026 en la pestaña de
           administración de la MISMA página (id="exp-panel"), no en la landing:
           la landing quedó en dos acciones (subir RUP / acceso con clave). */
        for (const debe of ['id="onboarding"', "Convertí tu RUP en contratos.", 'id="rup-archivo"',
          'id="btn-subir-rup"', "/onboarding.js", "formato_experiencia.csv",
          'id="exp-panel"', 'id="btn-exp-cargar"', 'id="rup-progreso"', 'id="btn-ir-gate"']) {
          assert.ok(html.includes(debe), `index.html sin ${debe}`);
        }
        // el gate SIGUE existiendo (nace oculto): el acceso con clave a los
        // perfiles del dueño no desaparece por añadir el onboarding
        assert.ok(/id="gate"[^>]*class="[^"]*hidden/.test(html) || /class="[^"]*hidden[^"]*"[^>]*id="gate"/.test(html),
          "el gate debe nacer oculto: la primera pantalla es el onboarding");
        assert.ok(html.indexOf('id="onboarding"') < html.indexOf('id="gate"'), "el onboarding va antes del gate");

        const ob = fs.readFileSync(path.join(__dirname, "..", "public", "onboarding.js"), "utf8");
        new Function(ob); // valida sintaxis sin ejecutar
        const obSin = sinComentarios(ob);
        // llama a la CANÓNICA, no al alias del rewrite (si el rewrite fallara,
        // el botón tiene que seguir funcionando)
        assert.ok(obSin.includes("/api/admin/rup?origen=pdf"), "onboarding.js debe llamar a la ruta canónica");
        assert.ok(!/fetch\(\s*["'`]\/api\/admin\/rup-desde-pdf/.test(obSin),
          "onboarding.js no puede depender del rewrite para funcionar");
        // la versión de pdf.js va CLAVADA y es LA MISMA que la de pliego.js:
        // dos versiones distintas del mismo motor en el mismo sitio es la
        // divergencia silenciosa clásica
        const plg = fs.readFileSync(path.join(__dirname, "..", "public", "pliego.js"), "utf8");
        const vOb = /const PDFJS_VERSION = "([^"]+)"/.exec(ob);
        const vPlg = /const PDFJS_VERSION = "([^"]+)"/.exec(plg);
        assert.ok(vOb && vPlg && vOb[1] === vPlg[1],
          `onboarding.js y pliego.js usan versiones distintas de pdf.js: ${vOb && vOb[1]} vs ${vPlg && vPlg[1]}`);
        // la misma prohibición que ya vigila los conteos en los demás frontends
        assert.ok(!/\.(unspsc_count|contratos_cargados|terminos_extraidos)\s*\|\|\s*0/.test(obSin),
          "un `|| 0` sobre un conteo convierte «no sé» en «cero»");

        /* LAS DOS COPIAS DE lineasDePagina ESTÁN ATADAS POR ESTA PRUEBA (el
           patrón de `numeroLocal`): son dos páginas y dos IIFE, así que la
           duplicación es justificada — pero si divergieran, el texto que manda
           el onboarding y el que manda el lector de pliegos partirían columnas
           de formas distintas y nadie se enteraría. Se EJECUTAN las dos sobre
           los mismos fragmentos y se exige el mismo resultado. */
        {
          const extraerFn = (fuente, nombre) => {
            const i = fuente.indexOf(`function ${nombre}`);
            assert.ok(i > 0, `no se encontró ${nombre} en el fuente`);
            const fin = fuente.indexOf("\n  }", i);
            return fuente.slice(i, fin + 4);
          };
          const plg = fs.readFileSync(path.join(__dirname, "..", "public", "pliego.js"), "utf8");
          const fnOb = new Function(`${extraerFn(ob, "lineasDePagina")}; return lineasDePagina;`)();
          const fnPlg = new Function(`${extraerFn(plg, "lineasDePagina")}; return lineasDePagina;`)();
          const frag = (str, x, y, w) => ({ str, transform: [1, 0, 0, 10, x, y], width: w, height: 10 });
          const fragmentos = [
            frag("ITEM", 20, 700, 30), frag("DESCRIPCION", 80, 700, 80), frag("UNIDAD", 300, 700, 40),
            frag("1.1", 20, 680, 30), frag("SUBBASE", 80, 680, 40), frag("GRANULAR", 125, 680, 40), frag("M3", 300, 680, 20),
            frag("linea suelta", 20, 640, 60),
          ];
          const salidaOb = fnOb(fragmentos);
          assert.strictEqual(salidaOb, fnPlg(fragmentos),
            "lineasDePagina divergió entre onboarding.js y pliego.js: las columnas se partirían distinto según la página");
          assert.ok(salidaOb.includes("\t"), "el hueco grande en X debe producir TAB (es lo que lee el servidor)");

          /* el parser de CSV del onboarding, ejecutado desde el fuente: la
             comilla de PULGADAS a mitad de celda no puede tragarse la fila, y
             la comilla que sí abre campo (RFC 4180) sigue funcionando */
          const fuenteCsv = `const COLUMNAS_OBLIGATORIAS = ["objeto","valor_cop","fecha_inicio","fecha_fin","entidad"];\n`
            + `${extraerFn(ob, "parsearCsv")}\n${extraerFn(ob, "csvAContratos")}\nreturn { parsearCsv, csvAContratos };`;
          const { parsearCsv, csvAContratos } = new Function(fuenteCsv)();
          const csvPulgadas = 'objeto,valor_cop,fecha_inicio,fecha_fin,entidad,unspsc\n'
            + 'Tuberia de 4" en PVC,95000000,10/01/2024,20/02/2024,ALCALDIA,72141000\n'
            + '"Obra A, fase 2",100000000,01/01/2024,02/02/2024,ENTIDAD,\n'
            + '# comentario que se ignora\n';
          const conv = csvAContratos(parsearCsv(csvPulgadas));
          assert.ok(!conv.error, `el CSV con pulgadas no convirtió: ${conv.error}`);
          assert.strictEqual(conv.contratos.length, 2);
          assert.strictEqual(conv.contratos[0].objeto, 'Tuberia de 4" en PVC',
            "la comilla a mitad de celda es texto, no apertura de campo");
          assert.strictEqual(conv.contratos[0].valor_cop, "95000000", "la comilla de pulgadas corrió las columnas");
          assert.strictEqual(conv.contratos[1].objeto, "Obra A, fase 2", "la comilla que abre campo (RFC 4180) dejó de funcionar");
        }

        const js = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
        const jsSin = sinComentarios(js);
        assert.ok(jsSin.includes("detecta_perfil_rup"), "app.js debe leer el perfil guardado por el onboarding");
        assert.ok(jsSin.includes("perfil_caducado") && /olvidarPerfilRup\(\)/.test(jsSin),
          "un 404 de perfil caducado debe olvidar el perfil guardado, no repetirse para siempre");
        /* entrar por `?perfil=rup_…` NO pasa el gate: abrirApp no puede marcar
           la sesión como «con clave», y sin gate el selector queda podado al
           perfil del RUP (los perfiles del dueño no se regalan por URL) */
        {
          const iAbrir = jsSin.indexOf("function abrirApp()");
          const cuerpoAbrir = jsSin.slice(iAbrir, jsSin.indexOf("\n  }", iAbrir));
          assert.ok(!/sessionStorage\.setItem/.test(cuerpoAbrir),
            "abrirApp volvió a marcar la sesión: entrar por un rup_ contaría como haber pasado el gate");
          assert.ok(/soloEste/.test(jsSin), "falta la poda del selector para quien entra sin gate");
        }

        // el alias literal existe como rewrite (no como función: el plan Hobby
        // está en 12 exactas) y apunta al endpoint real CON el origen
        const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
        const rw = (vercel.rewrites || []).find((x) => x.source === "/api/admin/rup-desde-pdf");
        assert.ok(rw && rw.destination === "/api/admin/rup?origen=pdf",
          "el alias /api/admin/rup-desde-pdf debe apuntar a /api/admin/rup?origen=pdf");
      }

      /* 11 · limpieza: los perfiles dinámicos no contaminan lo que sigue */
      {
        const dinamicas = [
          ...await redis.scan(CLAVES.patronPerfilesDinamicos),
          ...await redis.scan(CLAVES.patronUnspscDinamicos),
        ];
        if (dinamicas.length) await redis.del(...dinamicas);
        perfilDinamico.olvidarPerfilesDinamicos();
        assert.ok(!Object.keys(PERFILES).some((k) => k.startsWith("rup_")),
          "quedaron perfiles dinámicos inyectados en PERFILES");
      }
      console.log(`  · onboarding RUP por PDF: 4 códigos leídos, TTL puesto, perfil dinámico servido sin tocar a los fijos, errores accionables y cableado del frontend verificados`);
    }

    /* ════════════════════════════════════════════════════════════════════
       j. EDITOR DE APU (ago 2026): catálogo, inferencia, cálculo y borradores.

       Corre ANTES del bloque h-bis a propósito: allí el catálogo de precios se
       carga en Redis, y aquí hace falta el estado contrario —sin cargar— para
       comprobar la degradación honesta a la semilla del repositorio. Al final
       del bloque se carga, se verifica que el cálculo cambia de vía, y se borra
       todo `apu:*` para que h-bis empiece de cero como espera.

       Lo que de verdad se vigila no es que el endpoint responda 200, sino las
       tres familias de invariantes que hacen creíble un presupuesto:

         · ARITMÉTICAS  — `cantidad × unitario = total` por fila (invariante 7
           del informe) y los cuatro componentes suman el costo directo. Si no
           cuadran, la tabla que ve el dueño miente y no hay forma de notarlo.
         · DE MONOTONÍA — el rendimiento DIVIDE (bajarlo tiene que encarecer) y
           subir el anticipo no puede subir la financiación requerida. Son las
           dos que atrapan un signo invertido, que es el error clásico del APU.
         · DE HONESTIDAD — un ítem que no está en el catálogo NO suma cero al
           total, y un departamento sin región cotizada NO se asigna a la más
           parecida ni recibe factor 1,00.
       ════════════════════════════════════════════════════════════════════ */
    {
      const apu = require("../api/apu/[accion].js");
      const calculo = require("../lib/apu/calculo.js");
      const inferencia = require("../lib/apu/inferencia.js");
      const tipologias = require("../lib/apu/tipologias.js");
      const catalogoLib = require("../lib/apu/catalogo.js");

      /* ---- j.1 autorización: `catalogo` PÚBLICO, las otras cinco con token ---- */
      for (const [ruta, metodo] of [["inferir", "POST"], ["calcular", "POST"],
        ["guardar", "POST"], ["cargar", "GET"], ["listar", "GET"]]) {
        const sinTok = await invocar(apu, `/api/apu/${ruta}`, {}, { metodo, body: {} });
        assert.strictEqual(sinTok.status, 401, `/api/apu/${ruta} sirvió sin token`);
        const malTok = await invocar(apu, `/api/apu/${ruta}`, { "x-historico-token": "no" }, { metodo, body: {} });
        assert.strictEqual(malTok.status, 401, `/api/apu/${ruta} aceptó un token inválido`);
      }
      /* El catálogo NO exige token, y eso es la regla del proyecto, no una
         excepción: lo que no sale sin llave son las cifras del PERFIL. Aquí son
         precios de referencia de mercado. Sin catálogo cargado responde 503 con
         el siguiente paso, nunca un 200 con listas vacías — un `[]` afirmaría
         «no hay insumos», que no es lo mismo que «no lo he cargado». */
      {
        const r = await invocar(apu, "/api/apu/catalogo");
        assert.notStrictEqual(r.status, 401, "el catálogo de precios NO puede exigir token");
        assert.strictEqual(r.status, 503, "sin catálogo cargado debía responder 503");
        assert.ok(/cargar-catalogo/.test(r.cuerpo.siguiente_paso || ""), "el 503 debe decir cómo cargarlo");
        assert.ok(!("insumos" in r.cuerpo), "sin catálogo no puede viajar una lista de insumos vacía");
      }
      // acción inexistente y verbo equivocado
      assert.strictEqual((await invocar(apu, "/api/apu/inventada", CAB_TOKEN)).status, 404);
      assert.strictEqual((await invocar(apu, "/api/apu/calcular", CAB_TOKEN)).status, 405, "«calcular» exige POST");
      assert.strictEqual((await invocarPost(apu, "/api/apu/listar", {}, CAB_TOKEN)).status, 405, "«listar» exige GET");

      /* ---- j.2 las dos tablas del repositorio (tipologías y regiones) ---- */
      {
        const m = tipologias.meta();
        assert.strictEqual(m.tipologias_n, 22, "el catálogo cerrado son 22 tipologías");
        assert.strictEqual(m.departamentos_con_region + m.departamentos_sin_base, 33,
          "32 departamentos + Bogotá: el mapa tiene que cubrirlos todos, con región o declarados sin base");

        /* Toda tipología apunta a códigos que EXISTEN en el catálogo de precios.
           Una referencia rota produciría presupuestos incompletos sin que nadie
           supiera por qué. */
        const validos = new Set(catalogoLib.SEMILLA.items.map((i) => i.codigo));
        for (const t of tipologias.TIPOLOGIAS) {
          for (const c of tipologias.itemsDeTipologia(t.codigo)) {
            assert.ok(validos.has(c), `la tipología ${t.codigo} referencia el ítem inexistente ${c}`);
          }
        }
        /* Y todo departamento con región apunta a una región que EXISTE. Las dos
           mitades del mapa van en el mismo PR justo por esto. */
        const regiones = new Set(catalogoLib.SEMILLA.regiones.map((r) => r.id));
        for (const d of tipologias.departamentosConRegion()) {
          const r = tipologias.regionDeDepartamento(d);
          assert.strictEqual(r.estado, "mapeado");
          assert.ok(regiones.has(r.region), `${d} apunta a la región inexistente «${r.region}»`);
        }
      }

      /* ---- j.3 inferencia: los tres estados y el veto del UNSPSC ---- */
      {
        const verde = await invocarPost(apu, "/api/apu/inferir",
          { objeto: "CONSTRUCCION DE PLACA HUELLA EN LA VIA TERCIARIA VEREDA EL RETIRO, 1.500 ml", codigos_unspsc: "72141100" }, CAB_TOKEN);
        assert.strictEqual(verde.cuerpo.estado, "verde", "una placa huella bien escrita con su UNSPSC debe salir 🟢");
        assert.strictEqual(verde.cuerpo.tipologia.codigo, "VIA-PH");
        assert.ok(verde.cuerpo.items.length > 0, "un 🟢 con catálogo tiene que proponer ítems");
        assert.ok(verde.cuerpo.items.every((i) => i.codigo && i.en_catalogo),
          "los ítems propuestos deben existir en el catálogo y venir enriquecidos con su descripción");
        // decimal COLOMBIANO: «1.500» son mil quinientos, no uno coma cinco
        assert.deepStrictEqual(verde.cuerpo.cantidades.map((c) => [c.valor, c.unidad]), [[1500, "ml"]],
          "el punto separa MILES: leerlo como decimal divide la obra por mil");

        // el UNSPSC VETA: mismo texto, código de red de acueducto → 🟡
        const vetado = await invocarPost(apu, "/api/apu/inferir",
          { objeto: "CONSTRUCCION DE PLACA HUELLA EN LA VIA TERCIARIA VEREDA EL RETIRO", codigos_unspsc: "40174400" }, CAB_TOKEN);
        assert.strictEqual(vetado.cuerpo.estado, "amarillo",
          "un léxico convencido contra un UNSPSC incompatible tiene que degradar a 🟡, no subir a verde");
        assert.strictEqual(vetado.cuerpo.motivo, "unspsc_incompatible");

        // sin verbo de obra no se presupuesta, aunque el objeto sea legible
        const suministro = await invocarPost(apu, "/api/apu/inferir",
          { objeto: "SUMINISTRO DE PAPELERIA Y UTILES DE OFICINA PARA LA ALCALDIA" }, CAB_TOKEN);
        assert.strictEqual(suministro.cuerpo.estado, "no_determinada");
        assert.strictEqual(suministro.cuerpo.items.length, 0, "un ⚪ NO puede proponer ítems");

        // una tipología SIN cobertura en el catálogo lo DICE en vez de callarse
        const sinItems = inferencia.inferir("SUMINISTRO E INSTALACION DE SENALIZACION VIAL VERTICAL Y DEMARCACION HORIZONTAL DE LA MALLA VIAL");
        if (sinItems.tipologia && sinItems.tipologia.codigo === "VIA-SEN") {
          assert.strictEqual(sinItems.items.length, 0);
          assert.ok(/no tiene .tems|a mano/i.test(sinItems.mensaje),
            "si el catálogo no cubre la tipología hay que decirlo, no devolver una lista vacía sin explicación");
        }

        // la regla de atribución: un número de contrato no es una cantidad
        const atribucion = inferencia.inferir("CONSTRUCCION DE PLACA HUELLA VEREDA X CONTRATO 2024-350");
        assert.ok(!atribucion.cantidades.some((c) => c.valor === 2024),
          "sin la regla de atribución, «CONTRATO 2024-350» se lee como 2024 km de vía");

        /* LA INVARIANTE EXHAUSTIVA: los tres estados suman los evaluados. Es la
           misma que exige /api/diagnostico y existe para que ningún objeto se
           pierda sin quedar contado en algún estado. */
        const objetos = [
          "CONSTRUCCION DE PLACA HUELLA EN VIA TERCIARIA", "SUMINISTRO DE PAPELERIA",
          "MEJORAMIENTO DE LA RED DE ACUEDUCTO DEL CORREGIMIENTO", "", "CONVOCATORIA PUBLICA 001",
          "PAVIMENTACION EN MEZCLA DENSA EN CALIENTE MDC-19", "MANTENIMIENTO DE VEHICULOS",
          "CONSTRUCCION DE UNIDADES SANITARIAS CON POZO SEPTICO",
        ];
        const conteo = { verde: 0, amarillo: 0, no_determinada: 0 };
        for (const o of objetos) conteo[inferencia.inferir(o).estado]++;
        assert.strictEqual(conteo.verde + conteo.amarillo + conteo.no_determinada, objetos.length,
          "los estados de la inferencia deben sumar EXACTAMENTE los objetos evaluados");
        for (const e of Object.keys(conteo)) assert.ok(inferencia.ESTADOS.includes(e));
      }

      /* ---- j.3-bis TRES PUERTAS ANTI-FALSO-POSITIVO ----
         Los tres casos salieron del corpus REAL y los tres están reproducidos
         contra el motor antes de existir la puerta: sin ellas, `inferir` sugería
         obra para procesos que no lo son. El peor era el segundo, que salía
         VERDE —el único estado que presupuesta sin pedir el pliego— con seis
         ítems de placa huella para un contrato de caninos.

         Cada caso lo caza una puerta DISTINTA, y por eso se comprueba el motivo
         y no solo el estado: si una sola puerta cazara los tres, las otras dos
         estarían de adorno y nadie lo notaría hasta que una dejara de hacer
         falta. Las tres reutilizan la regla que ya existe en el repositorio
         (BLACKLIST_OBJETO, evaluarPertinencia, esSuministroPuro): tres listas
         paralelas de «esto no es obra» divergirían a la primera corrección. */
      {
        const CASOS = [
          {
            nombre: "servicio de internet → sugería interventoría",
            objeto: "SERVICIO DE INTERNET DEDICADO E INTERVENTORIA A LA SUPERVISION TECNICA DE LA RED",
            codigos: "80101600",
            motivo: "no_pertinente",
            porque: "el segmento 80 está en los RUP porque ahí viven la gerencia y la interventoría",
          },
          {
            nombre: "caninos con código de vías → APU de carretera",
            objeto: "ADIESTRAMIENTO DE CANINOS Y MANTENIMIENTO DE LA PLACA HUELLA DE LA VIA TERCIARIA VEREDA EL PORVENIR",
            codigos: "72141000",
            motivo: "blacklist_objeto",
            porque: "la PERTINENCIA no cubre «caninos»: hace falta la blacklist heredada",
          },
          {
            nombre: "compraventa de tubería → APU de acueducto",
            objeto: "COMPRAVENTA DE TUBERIA PVC PARA LA RED DE ACUEDUCTO",
            codigos: "40174000",
            motivo: "suministro_puro",
            porque: "ningún código ancla obra y el texto es de adquisición sin verbo de obra",
          },
        ];

        for (const c of CASOS) {
          // por el endpoint, que es por donde llega de verdad
          const r = await invocarPost(apu, "/api/apu/inferir",
            { objeto: c.objeto, codigos_unspsc: c.codigos }, CAB_TOKEN);
          assert.strictEqual(r.status, 200, `${c.nombre}: un rechazo es un RESULTADO, no un error`);
          assert.strictEqual(r.cuerpo.estado, "no_determinada",
            `${c.nombre}: tiene que salir ⚪ — ${c.porque}`);
          assert.strictEqual(r.cuerpo.motivo, c.motivo,
            `${c.nombre}: lo caza otra puerta (${r.cuerpo.motivo}), así que «${c.motivo}» no está haciendo su trabajo`);
          assert.strictEqual(r.cuerpo.items.length, 0, `${c.nombre}: un ⚪ NO puede proponer ítems`);
          assert.strictEqual(r.cuerpo.tipologia, null, `${c.nombre}: tampoco puede nombrar una tipología`);
          assert.deepStrictEqual(r.cuerpo.cantidades, [], `${c.nombre}: ni leerle cantidades`);
          assert.ok(r.cuerpo.no_pertinente && r.cuerpo.no_pertinente.nivel === "rojo",
            `${c.nombre}: el rechazo debe viajar con su motivo auditable, no solo como estado`);
          // el mensaje tiene que EXPLICARLO: un ⚪ sin razón no se puede discutir
          assert.ok(/no es de obra|suministro|COMPRA/i.test(r.cuerpo.mensaje),
            `${c.nombre}: el mensaje no dice por qué se rechazó`);
        }
        // las tres puertas son distintas: si dos casos comparten motivo, sobra una
        assert.strictEqual(new Set(CASOS.map((c) => c.motivo)).size, 3,
          "los tres casos deben caer por tres puertas distintas");

        /* NO SE PUEDE SOBREBLOQUEAR, que es el error simétrico y el que dejaría
           la herramienta inservible. Cuatro objetos de obra legítima que TIENEN
           que seguir pasando, incluido el que separa una compra pura de una obra
           con suministro dentro: «SUMINISTRO E INSTALACIÓN» sí es obra. */
        const LEGITIMOS = [
          ["CONSTRUCCION DE PLACA HUELLA EN LA VIA TERCIARIA VEREDA EL PORVENIR", "72141000", "VIA-PH"],
          ["SUMINISTRO E INSTALACION DE TUBERIA PVC PARA LA RED DE ACUEDUCTO", "40174000", "AGU-RED"],
          ["CONSTRUCCION DE ALCANTARILLADO SANITARIO Y POZOS DE INSPECCION", "72152000", "ALC-RED"],
          ["INTERVENTORIA TECNICA A LA CONSTRUCCION DE PLACA HUELLA EN VIA TERCIARIA", "81101500", null],
        ];
        for (const [objeto, codigos, tipEsperada] of LEGITIMOS) {
          const r = inferencia.inferir(objeto, { codigos_unspsc: codigos });
          assert.notStrictEqual(r.estado, "no_determinada",
            `las puertas bloquearon obra legítima: «${objeto.slice(0, 50)}…» (${r.motivo})`);
          if (tipEsperada) {
            assert.strictEqual(r.tipologia.codigo, tipEsperada,
              `«${objeto.slice(0, 40)}…» debía seguir clasificándose como ${tipEsperada}`);
          }
        }

        /* SOLO EL ROJO RECHAZA. El amarillo de `evaluarPertinencia` significa «el
           objeto no lo dice explícitamente», y cerrar por eso sería bloquear por
           falta de información — lo contrario de la doctrina del proyecto. Se
           vigila en el código porque un `!p.ok` de más lo rompería en silencio. */
        {
          const fuente = sinComentarios(fs.readFileSync(path.join(__dirname, "..", "lib", "apu", "inferencia.js"), "utf8"));
          assert.ok(/p\.nivel === "rojo"/.test(fuente),
            "la puerta de pertinencia debe exigir ROJO: el amarillo no puede bloquear");
          /* Y el `require` de filtros va DIFERIDO dentro de la función: `filtros`
             participa en dos ciclos que resuelve con esta misma técnica, así que
             pedirlo en tiempo de carga ataría este módulo a ese nudo. */
          const cabecera = fuente.slice(0, fuente.indexOf("function tieneVerboDeObra"));
          assert.ok(!/require\("\.\.\/filtros\.js"\)/.test(cabecera),
            "el require de filtros no puede ir en tiempo de carga: va diferido dentro de la función");
          assert.ok(/require\("\.\.\/filtros\.js"\)/.test(fuente),
            "las tres puertas tienen que LLAMAR a filtros, no reimplementar sus listas");
          // y no se han fabricado listas paralelas
          for (const prohibido of ["BLACKLIST_APU", "NO_PERTINENTE_APU", "SUMINISTRO_RE"]) {
            assert.ok(!fuente.includes(prohibido),
              `${prohibido}: una segunda definición de «esto no es obra» diverge a la primera corrección`);
          }
        }

        /* NO HAY CICLO DE REQUIRES. Hoy la cadena de `filtros` no alcanza
           `apu/`, y esta prueba lo comprueba de verdad en vez de suponerlo: si
           alguien añadiera `apu/*` a esa cadena, el diferido salva la carga pero
           conviene enterarse igual. */
        {
          const alcanzados = new Set();
          const recorrer = (rel, prof) => {
            if (alcanzados.has(rel) || prof > 6) return;
            alcanzados.add(rel);
            let src = "";
            try { src = fs.readFileSync(path.join(__dirname, "..", "lib", rel), "utf8"); } catch { return; }
            for (const m of src.matchAll(/require\("\.\/([a-z_/]+)\.js"\)/g)) recorrer(`${m[1]}.js`, prof + 1);
          };
          recorrer("filtros.js", 0);
          assert.ok(![...alcanzados].some((f) => f.startsWith("apu")),
            `la cadena de filtros alcanza apu/ → ciclo: ${[...alcanzados].filter((f) => f.startsWith("apu")).join(", ")}`);
        }

        /* La invariante exhaustiva SIGUE valiendo con las puertas puestas: los
           rechazos nuevos son `no_determinada`, no un cuarto estado inventado. */
        const conPuertas = [
          "CONSTRUCCION DE PLACA HUELLA EN VIA TERCIARIA",
          "ADIESTRAMIENTO DE CANINOS Y MANTENIMIENTO DE LA PLACA HUELLA",
          "COMPRAVENTA DE TUBERIA PVC PARA LA RED DE ACUEDUCTO",
          "SERVICIO DE INTERNET DEDICADO E INTERVENTORIA A LA SUPERVISION TECNICA",
          "MEJORAMIENTO DE LA RED DE ACUEDUCTO DEL CORREGIMIENTO",
        ];
        const cuenta = { verde: 0, amarillo: 0, no_determinada: 0 };
        for (const o of conPuertas) {
          const e = inferencia.inferir(o, { codigos_unspsc: "40174000" }).estado;
          assert.ok(inferencia.ESTADOS.includes(e), `estado fuera del catálogo cerrado: «${e}»`);
          cuenta[e]++;
        }
        assert.strictEqual(cuenta.verde + cuenta.amarillo + cuenta.no_determinada, conPuertas.length,
          "las puertas no pueden hacer que un objeto se pierda sin quedar contado en algún estado");
        console.log(`  · inferencia APU: 3 falsos positivos del corpus real cerrados por 3 puertas distintas `
          + `(blacklist · pertinencia · anti-suministro) y obra legítima intacta`);
      }

      /* ---- j.4 cálculo: las invariantes aritméticas ---- */
      const itemsPrueba = [
        { item_id: "INV-PH.1", cantidad: 900 },
        { item_id: "INV-320.1", cantidad: 120 },
        { item_id: "INV-640.1", cantidad: 3200 },
      ];
      const cfgBase = { aiu_pct: 15, utilidad_pct: 5, imprevistos_pct: 5 };
      const calc = await invocarPost(apu, "/api/apu/calcular",
        { items: itemsPrueba, departamento: "ANTIOQUIA", config: cfgBase }, CAB_TOKEN);
      assert.strictEqual(calc.status, 200);
      {
        const r = calc.cuerpo;
        let sumaTotales = 0;
        for (const it of r.items) {
          const esperado = it.costo_directo_unitario * it.cantidad;
          assert.ok(Math.abs(esperado - it.costo_total) <= Math.max(0.5, it.cantidad * 0.01),
            `${it.item_id}: cantidad × unitario (${esperado}) ≠ total (${it.costo_total})`);
          const suma = it.costo_material_unitario + it.costo_mano_obra_unitario
            + it.costo_equipo_unitario + it.costo_transporte_unitario;
          assert.ok(Math.abs(suma - it.costo_directo_unitario) < 0.01,
            `${it.item_id}: los componentes no suman el costo unitario`);
          sumaTotales += it.costo_total;
        }
        assert.ok(Math.abs(sumaTotales - r.resumen.costo_directo_total) < 1,
          "la suma de los ítems no da el costo directo total");
        const pc = r.resumen.por_componente;
        assert.ok(Math.abs((pc.material + pc.mano_obra + pc.equipo + pc.transporte) - r.resumen.costo_directo_total) < 1,
          "el reparto por componente no suma el costo directo: un peso se pierde sin que nadie lo note");
        assert.ok(pc.transporte > 0, "los ítems de la prueba llevan acarreo: el capítulo de transporte no puede salir en cero");

        // sin catálogo en Redis se usa la SEMILLA, y se DICE
        assert.strictEqual(r.catalogo.fuente, "semilla");
        assert.ok(r.alertas.some((a) => /no est. cargado en Redis/i.test(a)),
          "si el precio sale de la semilla y no del catálogo cargado, hay que decirlo");

        // AIU ADITIVO por defecto (el de los pliegos tipo)
        assert.strictEqual(r.configuracion.modo_aiu, "aditivo");
        assert.strictEqual(r.configuracion.aiu_total_pct, 25);
        assert.ok(Math.abs(r.resumen.precio_venta - r.resumen.costo_directo_total * 1.25) < 1,
          "el AIU aditivo debe multiplicar por 1 + A + I + U");
        const aiuCop = r.resumen.administracion + r.resumen.imprevistos + r.resumen.utilidad;
        assert.ok(Math.abs(aiuCop - (r.resumen.precio_venta - r.resumen.costo_directo_total)) < 1,
          "A + I + U en pesos debe ser exactamente lo que se añade al costo directo");
      }

      /* el modo COMPUESTO (la fórmula literal del encargo) sigue disponible y da
         MÁS que el aditivo: la diferencia es real y por eso el defecto no puede
         ser el compuesto */
      {
        const comp = calculo.calcularPresupuesto({
          items: itemsPrueba, departamento: "ANTIOQUIA", config: { ...cfgBase, modo_aiu: "compuesto" } });
        const adit = calculo.calcularPresupuesto({ items: itemsPrueba, departamento: "ANTIOQUIA", config: cfgBase });
        assert.ok(comp.resumen.precio_venta > adit.resumen.precio_venta,
          "componer el AIU tiene que dar más caro que sumarlo; si dieran igual, la corrección no estaría aplicada");
        assert.strictEqual(comp.resumen.costo_directo_total, adit.resumen.costo_directo_total,
          "el modo de AIU no puede alterar el costo DIRECTO");
      }

      /* ---- j.5 monotonía: el rendimiento DIVIDE ---- */
      {
        const rapido = calculo.calcularPresupuesto({
          items: [{ item_id: "INV-PH.1", cantidad: 100, rendimiento_override: 40 }], config: cfgBase });
        const lento = calculo.calcularPresupuesto({
          items: [{ item_id: "INV-PH.1", cantidad: 100, rendimiento_override: 10 }], config: cfgBase });
        assert.ok(lento.items[0].costo_mano_obra_unitario > rapido.items[0].costo_mano_obra_unitario,
          "bajar el rendimiento tiene que ENCARECER la mano de obra: el rendimiento divide, no multiplica");
        assert.ok(Math.abs(lento.items[0].costo_material_unitario - rapido.items[0].costo_material_unitario) < 0.01,
          "el rendimiento no puede cambiar el costo de MATERIALES");
        assert.strictEqual(lento.items[0].rendimiento_es_override, true);
        // y el override NO puede haber mutado el catálogo compartido
        const otraVez = calculo.calcularPresupuesto({ items: [{ item_id: "INV-PH.1", cantidad: 100 }], config: cfgBase });
        assert.ok(otraVez.items[0].costo_mano_obra_unitario !== lento.items[0].costo_mano_obra_unitario,
          "el rendimiento del catálogo quedó pisado por un override: el catálogo es compartido entre peticiones");
      }

      /* subir el anticipo no puede subir la financiación requerida */
      {
        const sinAnt = calculo.calcularPresupuesto({ items: itemsPrueba, config: { ...cfgBase, anticipo_pct: 0 } });
        const conAnt = calculo.calcularPresupuesto({ items: itemsPrueba, config: { ...cfgBase, anticipo_pct: 30 } });
        assert.ok(conAnt.resumen.financiacion_requerida <= sinAnt.resumen.financiacion_requerida,
          "más anticipo no puede exigir MÁS financiación propia");
        // `null` es «sin dato» y `0` es «sin anticipo»: son cosas distintas
        const sinDato = calculo.calcularPresupuesto({ items: itemsPrueba, config: cfgBase });
        assert.strictEqual(sinDato.configuracion.anticipo_pct, null);
        assert.strictEqual(sinDato.configuracion.anticipo_es_sin_dato, true);
        assert.strictEqual(sinDato.resumen.anticipo_cop, null,
          "sin dato de anticipo no se publica una cifra de anticipo: sería un 0 creíble");
        assert.strictEqual(sinAnt.configuracion.anticipo_es_sin_dato, false,
          "un 0 tecleado por una persona SÍ es un dato: significa «sin anticipo»");
      }

      /* ---- j.6 honestidad: sin precio no vale cero, sin región no vale 1,00 --- */
      {
        const conRoto = calculo.calcularPresupuesto({
          items: [...itemsPrueba, { item_id: "ITEM-QUE-NO-EXISTE", cantidad: 50 }], config: cfgBase });
        const limpio = calculo.calcularPresupuesto({ items: itemsPrueba, config: cfgBase });
        assert.strictEqual(conRoto.resumen.items_incompletos, 1);
        assert.strictEqual(conRoto.resumen.costo_directo_total, limpio.resumen.costo_directo_total,
          "un ítem que no se puede costear NO puede sumar cero al total: tiene que quedarse fuera y contarse aparte");
        const roto = conRoto.items.find((i) => i.item_id === "ITEM-QUE-NO-EXISTE");
        assert.strictEqual(roto.costo_total, null, "un ítem sin datos publica null, jamás 0");
        assert.strictEqual(roto.motivo, "item_desconocido");

        /* Un departamento sin región cotizada NO se asigna a la más parecida.
           Chocó tiene motivo declarado; un departamento inventado también sale
           sin base. Ninguno de los dos recibe factor de relleno. */
        for (const d of ["CHOCO", "VAUPES", "REPUBLICA DE NARNIA"]) {
          const reg = tipologias.regionDeDepartamento(d);
          assert.strictEqual(reg.estado, "sin_base", `${d} debía salir sin base`);
          assert.strictEqual(reg.region, null, `${d} recibió una región de relleno`);
          assert.ok(reg.mensaje, `${d} sale sin base y sin decir por qué`);
        }
        // los alias resuelven a la misma celda (SECOP escribe el nombre de varias formas)
        assert.strictEqual(tipologias.regionDeDepartamento("Bogotá").region, "bogota_sabana");
        assert.strictEqual(tipologias.regionDeDepartamento("VALLE").estado,
          tipologias.regionDeDepartamento("VALLE DEL CAUCA").estado);

        // el presupuesto SALE igual, con la región base, y lo declara
        const sinBase = calculo.calcularPresupuesto({ items: itemsPrueba, departamento: "CHOCO", config: cfgBase });
        assert.strictEqual(sinBase.ajuste_regional.estado, "sin_base");
        assert.ok(sinBase.resumen.costo_directo_total > 0, "sin región el presupuesto se calcula igual: no bloquear por falta de información");
        assert.ok(sinBase.alertas.some((a) => /Sin referencia regional/i.test(a)),
          "usar la región base sin decirlo sería presentar Bogotá como si fuera Chocó");
        assert.strictEqual(sinBase.ajuste_regional.region_utilizada, catalogoLib.SEMILLA._meta.region_base);

        // y la región SÍ mueve el precio cuando la hay
        const costa = calculo.calcularPresupuesto({ items: itemsPrueba, departamento: "ATLANTICO", config: cfgBase });
        const bogota = calculo.calcularPresupuesto({ items: itemsPrueba, departamento: "CUNDINAMARCA", config: cfgBase });
        assert.strictEqual(costa.ajuste_regional.region, "costa_atlantica");
        assert.notStrictEqual(costa.resumen.costo_directo_total, bogota.resumen.costo_directo_total,
          "dos regiones con factores distintos no pueden dar el mismo costo directo");
      }

      /* ---- j.7 ajuste competitivo y sus alertas ---- */
      {
        const conBaja = await invocarPost(apu, "/api/apu/calcular", {
          items: itemsPrueba, departamento: "ANTIOQUIA",
          config: { ...cfgBase, aplicar_ajuste_competitivo: true, factor_baja: 8 },
        }, CAB_TOKEN);
        const r = conBaja.cuerpo;
        assert.ok(Math.abs(r.resumen.precio_final - r.resumen.precio_venta * 0.92) < 1,
          "el ajuste competitivo debe descontar exactamente el factor de baja");
        assert.ok(Math.abs(r.resumen.margen_final - (r.resumen.precio_final - r.resumen.costo_directo_total)) < 1,
          "margen_final = precio_final − costo_directo_total, tal como lo define el encargo");

        // una baja imposible tiene que AVISAR, no devolver un margen negativo mudo
        const suicida = calculo.calcularPresupuesto({
          items: itemsPrueba, config: { ...cfgBase, aplicar_ajuste_competitivo: true, factor_baja: 45 } });
        assert.ok(suicida.resumen.margen_final < 0, "con 45 % de baja el margen es negativo");
        assert.ok(suicida.alertas.some((a) => /p[eé]rdida/i.test(a)),
          "un precio por debajo del costo directo tiene que decirlo en una alerta");
        assert.ok(suicida.alertas.some((a) => /contribuci[oó]n/i.test(a)),
          "el margen sin deducciones debe advertir de la contribución del 5 %, «el olvido más caro del país»");
        const conDed = calculo.calcularPresupuesto({ items: itemsPrueba, config: { ...cfgBase, deducciones_pct: 9 } });
        assert.ok(conDed.resumen.margen_despues_deducciones < conDed.resumen.margen_final,
          "cargar deducciones tiene que reducir el margen");
      }

      /* ---- j.7-bis importación: la acción nueva, por el handler real ---- */
      {
        // misma regla que las demás acciones de armar oferta: token obligatorio
        assert.strictEqual((await invocarPost(apu, "/api/apu/importar", { filas: [{ descripcion: "x" }] }, {})).status, 401,
          "/api/apu/importar sirvió sin token");
        assert.strictEqual((await invocarPost(apu, "/api/apu/importar", { filas: [{ descripcion: "x" }] },
          { "x-historico-token": "no" })).status, 401, "…aceptó un token inválido");
        const get = await invocar(apu, "/api/apu/importar", CAB_TOKEN);
        assert.strictEqual(get.status, 405, "«importar» exige POST");
        assert.strictEqual((await invocarPost(apu, "/api/apu/importar", {}, CAB_TOKEN)).status, 400,
          "sin filas el error debe ser accionable, no un mapeo vacío con cara de éxito");

        const imp = await invocarPost(apu, "/api/apu/importar", {
          filas: [
            { codigo: "1.3", descripcion: "Suministro e instalación de canaleta metalica 15x5 con división", unidad: "ML", cantidad: 14, precio_archivo: 74596 },
            { descripcion: "Pisos en alfagres", unidad: "m2", cantidad: 75 },
            { descripcion: "Obra de arte conmemorativa en bronce", unidad: "und", cantidad: 1 },
          ],
          departamento: "BOGOTA D.C.",
        }, CAB_TOKEN);
        assert.strictEqual(imp.status, 200);
        const rm = imp.cuerpo.resumen_mapeo;
        assert.strictEqual(rm.firmes + rm.revisar + rm.personalizados, rm.total,
          "las categorías del mapeo tienen que sumar el total");
        assert.strictEqual(imp.cuerpo.catalogo.fuente, "semilla",
          "en el bloque j el catálogo no está en Redis: la vía tiene que decir «semilla»");
        assert.strictEqual(imp.cuerpo.filas[0].entrada_calculo.precio_manual, 74596,
          "el precio del archivo manda y viaja como precio_manual");

        /* …y las entradas del mapeo se calculan por el MISMO camino de siempre */
        const calcImp = await invocarPost(apu, "/api/apu/calcular", {
          items: imp.cuerpo.filas.map((f) => f.entrada_calculo),
          departamento: "BOGOTA D.C.",
          config: cfgBase,
        }, CAB_TOKEN);
        assert.strictEqual(calcImp.status, 200);
        assert.strictEqual(calcImp.cuerpo.items[0].sin_apu, true);
        assert.ok(Number.isFinite(calcImp.cuerpo.items[0].cd_catalogo),
          "el ítem con precio del archivo y mapeo publica la referencia del catálogo");
        const pcImp = calcImp.cuerpo.resumen.por_componente;
        assert.ok(Math.abs((pcImp.material + pcImp.mano_obra + pcImp.equipo + pcImp.transporte + pcImp.sin_desglose)
          - calcImp.cuerpo.resumen.costo_directo_total) < 1,
          "el reparto por componente + sin_desglose tiene que sumar el costo directo también vía handler");
      }

      /* ---- j.8 persistencia: guardar → cargar → listar, con TTL ---- */
      {
        const cuerpoGuardar = {
          perfil: "helder", nombre: "Placa huella vereda El Retiro",
          objeto: "CONSTRUCCION DE PLACA HUELLA", departamento: "ANTIOQUIA", entidad: "MUNICIPIO DE SOPETRAN",
          items: itemsPrueba, config: cfgBase, total: 123456789,
        };
        const g = await invocarPost(apu, "/api/apu/guardar", cuerpoGuardar, CAB_TOKEN);
        assert.strictEqual(g.status, 200);
        assert.ok(g.cuerpo.id, "guardar debe devolver el id generado");
        assert.strictEqual(g.cuerpo.expira_en_dias, 30, "el borrador vive 30 días (requerimiento)");
        const id = g.cuerpo.id;

        // el TTL está PUESTO de verdad, no solo prometido en el mensaje
        const ttl = await redis.ttl(`apu:presupuesto:helder:${id}`);
        assert.ok(ttl > 0 && ttl <= 30 * 24 * 3600, `el presupuesto se guardó sin TTL (ttl=${ttl})`);

        const c = await invocar(apu, `/api/apu/cargar?id=${id}&perfil=helder`, CAB_TOKEN);
        assert.strictEqual(c.status, 200);
        assert.strictEqual(c.cuerpo.presupuesto.nombre, cuerpoGuardar.nombre);
        assert.strictEqual(c.cuerpo.presupuesto.items.length, itemsPrueba.length);

        // los presupuestos son POR PERFIL: el de Helder no aparece en Génesis
        assert.strictEqual((await invocar(apu, `/api/apu/cargar?id=${id}&perfil=genesis`, CAB_TOKEN)).status, 404,
          "un presupuesto de Helder no puede cargarse como de Génesis");

        const l = await invocar(apu, "/api/apu/listar?perfil=helder", CAB_TOKEN);
        assert.strictEqual(l.status, 200);
        assert.ok(l.cuerpo.presupuestos.some((p) => p.id === id), "el listado no encontró lo recién guardado");
        assert.strictEqual(l.cuerpo.ilegibles, 0);
        assert.strictEqual((await invocar(apu, "/api/apu/listar?perfil=genesis", CAB_TOKEN)).cuerpo.total, 0);

        // id con caracteres que romperían el keyspace de Redis
        assert.strictEqual((await invocarPost(apu, "/api/apu/guardar", { ...cuerpoGuardar, id: "abc:*:def" }, CAB_TOKEN)).status, 400,
          "un id con «:» o «*» podría escribir fuera de su keyspace");
        assert.strictEqual((await invocar(apu, "/api/apu/cargar?id=noexiste&perfil=helder", CAB_TOKEN)).status, 404);
        assert.strictEqual((await invocarPost(apu, "/api/apu/guardar",
          { ...cuerpoGuardar, perfil: "inventado" }, CAB_TOKEN)).status, 400);

        // un borrador corrupto NO puede tumbar el listado entero
        await redis.set("apu:presupuesto:helder:corrupto", "no-es-base64-deflate");
        const lc = await invocar(apu, "/api/apu/listar?perfil=helder", CAB_TOKEN);
        assert.strictEqual(lc.status, 200, "un valor ilegible no puede tumbar el listado");
        assert.strictEqual(lc.cuerpo.ilegibles, 1, "el ilegible tiene que CONTARSE, no desaparecer en silencio");
        assert.ok(lc.cuerpo.presupuestos.some((p) => p.id === id), "el resto del listado debe seguir sirviéndose");
      }

      /* ---- j.9 con el catálogo YA cargado: la vía cambia y el precio también --
         Es la prueba de que el editor consume el catálogo de Redis y no se queda
         pegado a la semilla del repositorio. Al terminar se borra todo `apu:*`
         para que el bloque h-bis empiece con Redis limpio, como espera. */
      {
        const apuCargarCat = require("../api/admin/apu/cargar-catalogo.js");
        const carga = await invocar(apuCargarCat, "/api/admin/apu/cargar-catalogo", CAB_TOKEN, { metodo: "POST" });
        assert.strictEqual(carga.status, 200, "no se pudo cargar el catálogo de precios");

        const pub = await invocar(apu, "/api/apu/catalogo");
        assert.strictEqual(pub.status, 200, "con el catálogo cargado el endpoint público debe servirlo");
        assert.ok(pub.cuerpo.items.length > 0 && pub.cuerpo.insumos.length > 0 && pub.cuerpo.regiones.length > 0);
        assert.strictEqual(pub.cuerpo.tipologias, 22, "el catálogo público también expone el vocabulario de tipologías");
        assert.strictEqual(pub.cuerpo.departamentos.length, 33);
        // los cortes por parámetro siguen funcionando desde la ruta dinámica
        assert.strictEqual((await invocar(apu, "/api/apu/catalogo?bloque=items")).status, 200);
        assert.strictEqual((await invocar(apu, "/api/apu/catalogo?insumo=unicornio")).status, 404);
        assert.strictEqual((await invocar(apu, "/api/apu/catalogo?region=marte")).status, 404);

        const desdeRedis = await invocarPost(apu, "/api/apu/calcular",
          { items: itemsPrueba, departamento: "ANTIOQUIA", config: cfgBase }, CAB_TOKEN);
        assert.strictEqual(desdeRedis.cuerpo.catalogo.fuente, "redis",
          "con el catálogo cargado el cálculo tiene que leerlo de Redis, no de la semilla");
        assert.ok(!desdeRedis.cuerpo.alertas.some((a) => /no est. cargado en Redis/i.test(a)));

        /* LA INVARIANTE FUERTE: catálogo cargado y semilla dan el MISMO precio.
           Son la misma tabla por dos caminos; si divergieran, el presupuesto
           cambiaría según quién hubiera corrido la carga y ninguna de las dos
           cifras serviría para decidir nada. */
        const desdeSemilla = calculo.calcularPresupuesto({ items: itemsPrueba, departamento: "ANTIOQUIA", config: cfgBase });
        assert.strictEqual(desdeRedis.cuerpo.resumen.costo_directo_total, desdeSemilla.resumen.costo_directo_total,
          "el catálogo de Redis y la semilla del repositorio dan precios distintos: son la misma tabla por dos caminos");

        const sobras = await redis.scan("apu:*");
        if (sobras.length) await redis.del(...sobras);
        assert.strictEqual((await redis.scan("apu:*")).length, 0, "el bloque j dejó claves apu:* y h-bis empieza de cero");
      }

      /* ---- j.10 el frontend: cableado, orden del arranque y el «|| 0» ----
         Desde ago 2026 la app es UNA página (index.html) y UN archivo
         (app.js): el editor de APU vive en la pestaña #/apu y el panel en
         #/admin. Las invariantes son las mismas; el archivo donde se miran, no. */
      {
        const unoHtml = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
        const unoJs = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
        const xlsxJs = fs.readFileSync(path.join(__dirname, "..", "public", "xlsx.js"), "utf8");
        new Function(unoJs); // valida sintaxis sin ejecutar
        new Function(xlsxJs);

        for (const debe of ['id="gate"', 'id="app"', 'id="objeto"', 'id="btn-inferir"', 'id="departamento"',
          'id="aiu"', 'id="utilidad"', 'id="imprevistos"', 'id="anticipo"', 'id="ajuste-competitivo"',
          'id="factor-baja"', 'id="btn-sugerir-baja"', 'id="tabla"', 'id="btn-calcular"', 'id="btn-agregar"',
          'id="btn-exportar"', 'id="btn-guardar"', 'id="btn-listar"', 'id="seccion-resumen"',
          'id="tab-apu"', 'data-tab="apu"',
          "/app.js", "/xlsx.js", "cdn.tailwindcss.com"]) {
          assert.ok(unoHtml.includes(debe), `index.html sin ${debe}`);
        }
        assert.ok(unoJs.includes('"231105"'), "app.js sin la clave del gate");

        /* EL TOKEN VA INTEGRADO (decisión del dueño, ago 2026): no existe
           ningún formulario ni modal que lo pida — Vercel Password Protection
           es la capa de seguridad real y el token solo guarda las escrituras
           de Redis y las cifras del perfil. */
        assert.ok(unoJs.includes('const TOKEN = "MiExtraccion2025"'), "app.js sin el token integrado");
        assert.ok(!unoHtml.includes('id="modal-token"') && !unoHtml.includes('id="form-token"'),
          "el formulario del token no puede reaparecer en la página");

        /* EL ARRANQUE AUTOMÁTICO VA AL FINAL DEL IIFE. Misma lección que ya
           costó cara tres veces: colocado junto al gate, en la segunda visita
           de la misma pestaña moriría en la zona muerta temporal y lo haría
           EN SILENCIO (promesa rechazada). El arranque final tiene que ir
           DESPUÉS del estado de los tres módulos consolidados. */
        {
          const iAuto = unoJs.indexOf("const guardadoRup = perfilRupGuardado();");
          const iEditor = unoJs.indexOf("let CATALOGO = null;");
          const iPanel = unoJs.indexOf("let dashboardCargando = false;");
          assert.ok(iAuto > 0 && iEditor > 0 && iPanel > 0, "no se encontraron el arranque automático y el estado de los módulos");
          assert.ok(iAuto > iEditor && iAuto > iPanel,
            "el arranque automático corre antes de declarar el estado: morirá en la zona muerta temporal");
        }

        // el token va por CABECERA, jamás en la URL (logs de acceso e historial)
        assert.ok(!/\/api\/apu\/[a-z]+\?[^`"']*token=/.test(unoJs),
          "el token de /api/apu no puede viajar en la URL");
        assert.ok(unoJs.includes('"x-historico-token"'), "app.js debe mandar el token por cabecera");

        /* NINGÚN `|| 0` SOBRE UNA CIFRA DEL SERVIDOR: convierte «no sé» en
           «cero» y lo hace creíble. */
        const limpio = sinComentarios(unoJs);
        assert.ok(!/\b(?:it|p|s|r|e)\.[a-z_]*(?:total|procesos|contados|mediana|margen|precio|costo)[a-z_]*\s*\|\|\s*0/i.test(limpio),
          "un «|| 0» sobre una cifra del servidor convierte «no sé» en «cero»");
        assert.ok(/Number\.isFinite\(n\) \? /.test(limpio),
          "las cifras deben comprobarse con Number.isFinite antes de pintarse");

        /* ---- precarga desde el panel y bloque de rentabilidad ----
           El botón «APU» de una tarjeta o de una fila ya no abre otra página:
           fija `paramsProceso` y cambia a la pestaña. La MISMA cadena de
           parámetros de siempre, en memoria; la querystring queda de respaldo
           para los enlaces guardados. */
        assert.ok(/let paramsProceso/.test(limpio) && /new URLSearchParams\(location\.search\)/.test(limpio),
          "el editor debe precargarse de paramsProceso con la querystring de respaldo");
        assert.ok(/function abrirEditorConProceso\(/.test(limpio),
          "sin abrirEditorConProceso el botón APU de una fila no tiene a dónde llevar");
        assert.ok(limpio.includes("/api/apu/rentabilidad"), "app.js no llama a la acción de rentabilidad");
        for (const debe of ["id-proceso", "btn-rentabilidad", "seccion-rentabilidad"]) {
          assert.ok(unoHtml.includes(`id="${debe}"`), `index.html sin #${debe}`);
        }
        // el borrador tiene que llevar SU proceso, o el badge del panel no
        // tendría con qué encenderse
        assert.ok(/id_proceso:/.test(limpio), "al guardar hay que mandar el id del proceso");
        /* El departamento se fija DESPUÉS de cargar el catálogo: antes no existe
           la opción del desplegable que hay que seleccionar, y la precarga se
           perdería en silencio. */
        {
          const i = limpio.indexOf("async function arrancar()");
          const cuerpoArranque = limpio.slice(i, i + 900);
          assert.ok(cuerpoArranque.indexOf("await cargarCatalogo()") < cuerpoArranque.lastIndexOf("precargarDesdeURL()"),
            "la segunda precarga tiene que ir DESPUÉS de cargar el catálogo, o el departamento no se seleccionaría");
        }

        /* ---- el enganche en el panel (mismo archivo, pestaña admin) ---- */
        assert.ok(/closest\("\.btn-apu"\)/.test(limpio),
          "el manejador de la fila debe resolver el botón APU, o abriría además SECOP II");
        assert.ok(limpio.indexOf('e.target.closest(".btn-apu")', limpio.indexOf('$("d-destacados")')) <
          limpio.indexOf('const fila = e.target.closest(".fila-proceso")'),
          "la guarda del botón APU tiene que ir ANTES de resolver la fila");
        assert.ok(limpio.includes("/api/apu/listar?perfil="),
          "el listado de borradores se consulta aparte de /api/resumen, que se cachea 300 s");
        assert.ok(limpio.indexOf("await cargarApuListos(perfil)") < limpio.indexOf("pintarDashboard(cuerpo,"),
          "el listado tiene que cargarse ANTES de pintar, o el badge saldría una pintada tarde");
        assert.ok(unoHtml.includes("<th class=\"py-1\">APU</th>"), "index.html sin la columna APU");
        assert.ok(limpio.includes('colspan="7"'),
          "el estado vacío de la tabla tiene que cubrir las 7 columnas, no 6");

        // la sugerencia de baja exige BASE antes de interpolar una cifra
        assert.ok(/procesos\s*<\s*r\.min_procesos/.test(limpio),
          "sugerir el factor de baja sin comprobar el mínimo de procesos repetiría el defecto de «18,2 oferentes en 0 procesos»");

        // el desplegable distingue los departamentos SIN región cotizada: sin la
        // marca, elegir Chocó parecería igual de fiable que elegir Antioquia
        assert.ok(/sin regi.n cotizada/i.test(limpio),
          "el desplegable de departamentos debe marcar cuáles no tienen precio de referencia");

        // el editor vive en una PESTAÑA de la misma página: nada apunta ya a
        // /apu.html y ningún iframe lo embebe (X-Frame-Options: DENY)
        assert.ok(!unoHtml.includes('href="/apu.html"') && !/<iframe/.test(unoHtml),
          "el editor es una pestaña: ni enlaces a /apu.html ni iframes");
      }

      /* ---- j.11 el exportador .xlsx: un ZIP válido, con estilos de verdad --- */
      {
        const XLSXApu = require("../public/xlsx.js");
        const bytes = XLSXApu.construirLibro([
          {
            nombre: "Presupuesto",
            filas: [
              [{ v: "ANÁLISIS DE PRECIOS UNITARIOS", s: "titulo" }],
              [{ v: 'Obra "El Retiro" & Cía <test>', s: "negrita" }],
              [{ v: "Ítem", s: "encabezado" }, { v: "Total", s: "encabezado" }],
              [{ v: "INV-PH.1", s: "texto" }, { v: 59023041.6, s: "moneda" }],
            ],
            anchos: [20, 18], congelar: 3, fusiones: ["A1:B1"],
          },
          { nombre: "Desglose", filas: [[{ v: "detalle", s: "normal" }]] },
        ]);
        assert.ok(bytes.length > 2000, "el libro salió sospechosamente pequeño");
        assert.deepStrictEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04], "no es un ZIP");
        const buf = Buffer.from(bytes);
        assert.ok(buf.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])), "falta el fin del directorio central");

        // el contenido de las partes clave, leído del propio ZIP
        const partes = {};
        {
          let i = 0;
          while (i < buf.length - 4 && buf.readUInt32LE(i) === 0x04034b50) {
            const tam = buf.readUInt32LE(i + 18);
            const nLen = buf.readUInt16LE(i + 26);
            const eLen = buf.readUInt16LE(i + 28);
            const nombre = buf.slice(i + 30, i + 30 + nLen).toString("utf8");
            const ini = i + 30 + nLen + eLen;
            partes[nombre] = buf.slice(ini, ini + tam).toString("utf8");
            i = ini + tam;
          }
        }
        for (const necesaria of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
          "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]) {
          assert.ok(partes[necesaria], `el .xlsx no trae ${necesaria}`);
        }
        /* LO QUE SHEETJS NO HACE: la edición libre de `xlsx` descarta los
           estilos de celda al escribir (se comprobó: sale `<fonts count="1">`).
           Aquí se exige que el formato profesional esté DE VERDAD en el
           archivo, que es la razón entera de escribir el exportador a mano. */
        assert.ok(/<fonts count="[2-9]/.test(partes["xl/styles.xml"]), "el libro salió sin fuentes: los estilos se perdieron");
        assert.ok(partes["xl/styles.xml"].includes("<b/>"), "falta la negrita");
        assert.ok(partes["xl/styles.xml"].includes("FF111827"), "falta el relleno de la franja de título");
        // el código de formato viaja ESCAPADO (`&quot;$&quot;#,##0`): es XML, y
        // un lector real lo devuelve como `"$"#,##0`.
        assert.ok(partes["xl/styles.xml"].includes("&quot;$&quot;#,##0"), "falta el formato de moneda");
        assert.strictEqual((partes["xl/styles.xml"].match(/<numFmt numFmtId="\d+" formatCode="[^"]*"\/>/g) || []).length, 4,
          "un formatCode con comillas sin escapar rompe el atributo XML y con él el archivo entero");
        assert.ok(partes["xl/styles.xml"].includes("cellStyles"), "sin el estilo «Normal» los lectores aplican el suyo encima");
        assert.ok(partes["xl/worksheets/sheet1.xml"].includes("mergeCell"), "faltan las celdas combinadas del encabezado");
        assert.ok(partes["xl/worksheets/sheet1.xml"].includes('state="frozen"'), "falta el panel congelado");
        // el XML se escapa: un objeto de SECOP con comillas y & no puede romper el archivo
        assert.ok(partes["xl/worksheets/sheet1.xml"].includes("&amp;")
          && partes["xl/worksheets/sheet1.xml"].includes("&quot;")
          && partes["xl/worksheets/sheet1.xml"].includes("&lt;test&gt;"),
          "el XML no escapa comillas, ampersands ni ángulos: Excel se niega a abrir el archivo entero por uno solo");
        assert.ok(partes["xl/worksheets/sheet1.xml"].includes("<v>59023041.6</v>"),
          "los números tienen que ir como número, no como texto");
      }

      /* ---- j.12 el despliegue: presupuesto de funciones de Vercel ---- */
      {
        const vc = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
        assert.ok(vc.functions["api/apu/[accion].js"], "vercel.json no declara la función del APU");
        assert.strictEqual(vc.functions["api/apu/[accion].js"].includeFiles, "data/**",
          "sin data/** el catálogo de APU no llega al despliegue");

        /* EL LÍMITE DE HOBBY SON 12 FUNCIONES POR DESPLIEGUE, y se cuenta por
           ARCHIVOS bajo api/, no por entradas de vercel.json. Es un fallo de
           DESPLIEGUE COMPLETO, no del endpoint nuevo, así que conviene que
           salte aquí y no en producción. Por eso `/api/apu/catalogo` se plegó
           en la ruta dinámica en vez de conservar su archivo propio. */
        const contar = (dir) => fs.readdirSync(dir, { withFileTypes: true })
          .reduce((n, e) => n + (e.isDirectory() ? contar(path.join(dir, e.name))
            : (e.name.endsWith(".js") ? 1 : 0)), 0);
        const nFunciones = contar(path.join(__dirname, "..", "api"));
        assert.ok(nFunciones <= 12,
          `${nFunciones} funciones bajo api/: el plan Hobby de Vercel admite 12 por despliegue y lo rechazaría entero`);
        assert.ok(!fs.existsSync(path.join(__dirname, "..", "api", "apu", "catalogo.js")),
          "api/apu/catalogo.js volvió a existir: con él se pasa del límite de 12 funciones");

        /* LA CARGA DE LA EXPERIENCIA DESDE EL REPOSITORIO NO PUEDE SER UN
           ARCHIVO PROPIO, por lo mismo. La URL que pidió el encargo existe como
           REWRITE —que no cuenta como función— y tiene que apuntar al endpoint
           real con su origen: un rewrite que apunte a otra cosa sería una URL
           que promete algo que no hace. */
        assert.ok(!fs.existsSync(path.join(__dirname, "..", "api", "admin", "cargar-experiencia-genesis.js")),
          "api/admin/cargar-experiencia-genesis.js como archivo propio son 13 funciones: Vercel rechaza el despliegue ENTERO");
        const rw = (vc.rewrites || []).find((x) => x.source === "/api/admin/cargar-experiencia-genesis");
        assert.ok(rw, "falta el rewrite que expone /api/admin/cargar-experiencia-genesis");
        assert.ok(/^\/api\/admin\/experiencia\?/.test(rw.destination),
          `el rewrite tiene que apuntar al endpoint real, no a ${rw.destination}`);
        assert.ok(/origen=repositorio/.test(rw.destination),
          "sin origen=repositorio el alias cargaría el cuerpo de la petición, que en un POST sin cuerpo es un 400");
      }

      console.log(`  · APU: ${tipologias.meta().tipologias_n} tipologías · ${catalogoLib.SEMILLA.items.length} ítems · `
        + `${tipologias.meta().departamentos_con_region}/33 departamentos con región cotizada · `
        + `invariantes aritméticas, de monotonía y de honestidad verificadas · .xlsx con estilos reales`);
    }

    /* ═══════════ h-bis. Catálogo de precios APU en Redis ═══════════
       El encargo fija el esquema (hash por insumo, por ítem y por región), así
       que las aserciones se escriben contra ESE esquema y no contra lo que el
       código devuelva: si alguien renombra un campo, esto lo detiene.

       La invariante fuerte del bloque es la del SNAPSHOT: el catálogo se sirve
       desde un JSON comprimido para no pagar 70 comandos por petición, pero los
       hashes son la fuente de verdad. Se comprueba que las dos vías devuelven
       exactamente lo mismo y que el snapshot rancio o corrupto NO se sirve —
       dos fuentes de verdad que discrepan es el defecto que este proyecto ya
       pagó caro con `total_procesos`/`procesos_contados`. */
    {
      const apuCargar = require("../api/admin/apu/cargar-catalogo.js");
      /* `/api/apu/catalogo` lo sirve ahora la ruta DINÁMICA junto con las otras
         cinco acciones del editor. El archivo suelto desapareció por el límite
         de 12 funciones del plan Hobby —12 archivos bajo api/ más el del editor
         eran 13 y el despliegue falla entero—, pero la URL, el contrato y el
         hecho de que sea PÚBLICA se conservan intactos, que es justo lo que
         siguen comprobando estas aserciones. */
      const apuPublico = require("../api/apu/[accion].js");
      const apuLib = require("../lib/apu/catalogo.js");
      const S = apuLib.SEMILLA;
      const REGIONES = S.regiones.map((r) => r.id);

      const clavesCorpus = async () => (await redis.scan("licitaciones:*")).length;
      const corpusAntes = await clavesCorpus();

      /* --- el endpoint público sobre un catálogo que no está: 503 que DICE qué
         hacer, no un 200 con listas vacías (un [] afirmaría «no hay insumos») --- */
      {
        const r = await invocar(apuPublico, "/api/apu/catalogo");
        assert.strictEqual(r.status, 503, "sin catálogo cargado debía responder 503");
        assert.strictEqual(r.cuerpo.cargado, false);
        assert.ok(/cargar-catalogo/.test(r.cuerpo.siguiente_paso), "el 503 debe decir cómo cargarlo");
        assert.ok(!("insumos" in r.cuerpo), "sin catálogo no puede viajar una lista de insumos vacía");
      }

      /* --- la carga está PROTEGIDA: las tres formas de no tener permiso --- */
      {
        assert.strictEqual((await invocar(apuCargar, "/api/admin/apu/cargar-catalogo", {}, { metodo: "POST" })).status, 401,
          "sin token debía ser 401");
        assert.strictEqual((await invocar(apuCargar, "/api/admin/apu/cargar-catalogo?token=malo", {}, { metodo: "POST" })).status, 401,
          "con token equivocado debía ser 401");
        const guardado = process.env.HISTORICO_TOKEN;
        delete process.env.HISTORICO_TOKEN;
        const r = await invocar(apuCargar, "/api/admin/apu/cargar-catalogo", CAB_TOKEN, { metodo: "POST" });
        assert.strictEqual(r.status, 503, "sin HISTORICO_TOKEN en el entorno debía ser 503, nunca una llave por defecto");
        process.env.HISTORICO_TOKEN = guardado;
        // y un 401 no puede haber escrito nada
        assert.strictEqual((await redis.scan("apu:*")).length, 0, "un rechazo de autorización escribió en Redis");
      }

      /* --- carga --- */
      const carga = await invocar(apuCargar, "/api/admin/apu/cargar-catalogo", CAB_TOKEN, { metodo: "POST" });
      assert.strictEqual(carga.status, 200, `la carga falló: ${JSON.stringify(carga.cuerpo).slice(0, 300)}`);
      assert.strictEqual(carga.cuerpo.ok, true);
      assert.strictEqual(carga.cuerpo.escrito, true, "la primera carga tiene que escribir");
      assert.strictEqual(carga.cuerpo.insumos, S.insumos.length);
      assert.strictEqual(carga.cuerpo.items, S.items.length);
      assert.strictEqual(carga.cuerpo.regiones, S.regiones.length);

      /* --- el ESQUEMA DE CLAVES que fija el encargo, leído de Redis --- */
      {
        const kIns = await redis.scan("apu:insumos:*");
        const kItm = await redis.scan("apu:items:*");
        const kReg = await redis.scan("apu:factores_region:*");
        assert.strictEqual(kIns.length, S.insumos.length, "faltan hashes apu:insumos:*");
        assert.strictEqual(kItm.length, S.items.length, "faltan hashes apu:items:*");
        assert.strictEqual(kReg.length, S.regiones.length, "faltan hashes apu:factores_region:*");

        // insumo: unidad + precio_{region} + fecha_actualizacion (el encargo, literal)
        const h = await redis.hgetall("apu:insumos:cemento_gris_50kg");
        assert.ok(h.unidad, "el hash del insumo no trae «unidad»");
        assert.ok(h.fecha_actualizacion, "el hash del insumo no trae «fecha_actualizacion»");
        for (const reg of REGIONES) {
          const p = Number(h[`precio_${reg}`]);
          assert.ok(Number.isFinite(p) && p > 0, `el insumo no trae precio_${reg} positivo`);
        }
        // …y ese precio es EXACTAMENTE la derivación declarada, no un número suelto
        const cemento = S.insumos.find((i) => i.id === "cemento_gris_50kg");
        for (const r of S.regiones) {
          assert.strictEqual(Number(h[`precio_${r.id}`]), Math.round(cemento.precio_base * r.factor_materiales),
            `precio_${r.id} del cemento no coincide con precio_base × factor_materiales`);
        }

        // ítem: descripcion, unidad, unspsc_segmento e insumos (JSON del encargo)
        const hi = await redis.hgetall("apu:items:INV-630.4");
        assert.ok(hi.descripcion && hi.unidad, "el hash del ítem no trae descripción o unidad");
        assert.ok(/^\d{2}$/.test(hi.unspsc_segmento), "unspsc_segmento debe ser el segmento de dos dígitos");
        const comp = JSON.parse(hi.insumos);
        assert.ok(Array.isArray(comp) && comp.length, "«insumos» del ítem debe ser un array JSON");
        for (const linea of comp) {
          for (const campo of ["insumo_id", "cantidad_por_unidad", "rendimiento", "desperdicio"]) {
            assert.ok(campo in linea, `la composición del ítem no trae «${campo}»`);
          }
          assert.ok(await redis.hlen(`apu:insumos:${linea.insumo_id}`) > 0
            || (await redis.hgetall(`apu:insumos:${linea.insumo_id}`)).id,
            `el ítem referencia el insumo ${linea.insumo_id}, que no está en Redis`);
        }

        // región: los seis campos del encargo
        const hr = await redis.hgetall("apu:factores_region:costa_atlantica");
        for (const campo of ["factor_materiales", "factor_mano_obra", "factor_equipo",
          "factor_transporte", "aiu_tipico", "prestacional_tipico"]) {
          assert.ok(Number.isFinite(Number(hr[campo])), `el hash de región no trae «${campo}» numérico`);
        }
      }

      /* --- el catálogo NO toca el corpus: vive en `apu:*` y ninguna purga de
         la ingesta lo alcanza, ni él a ella --- */
      assert.strictEqual(await clavesCorpus(), corpusAntes,
        "cargar el catálogo APU modificó claves de `licitaciones:*`");

      /* --- idempotencia: «llena Redis si las claves no existen». Un segundo
         POST sin forzar no reescribe 70 claves para dejarlas igual --- */
      {
        const r2 = await invocar(apuCargar, "/api/admin/apu/cargar-catalogo", CAB_TOKEN, { metodo: "POST" });
        assert.strictEqual(r2.status, 200);
        assert.strictEqual(r2.cuerpo.escrito, false, "la segunda carga no debía reescribir");
        assert.strictEqual(r2.cuerpo.ya_cargado, true);
        assert.strictEqual(r2.cuerpo.version, carga.cuerpo.version, "sin escribir, el sello no puede cambiar");
        // …y con forzar sí, con sello NUEVO (dos cargas en el mismo milisegundo
        // darían el mismo ISO: por eso el sello lleva sufijo aleatorio)
        const r3 = await invocar(apuCargar, "/api/admin/apu/cargar-catalogo?forzar=true", CAB_TOKEN, { metodo: "POST" });
        assert.strictEqual(r3.cuerpo.escrito, true, "con forzar=true tiene que reescribir");
        assert.notStrictEqual(r3.cuerpo.version, carga.cuerpo.version, "una recarga tiene que cambiar el sello");
      }

      /* --- consulta PÚBLICA: sin token, a propósito. Aquí no hay cifras del
         perfil (patrimonio, K, CRPC): son precios de mercado --- */
      const publico = await invocar(apuPublico, "/api/apu/catalogo");
      assert.strictEqual(publico.status, 200, "el catálogo debe servirse SIN token");
      assert.strictEqual(publico.cuerpo.ok, true);
      assert.strictEqual(publico.cuerpo.via, "snapshot", "el catálogo entero debe salir del snapshot, no de 70 hashes");
      assert.strictEqual(publico.cuerpo.items.length, S.items.length);
      assert.strictEqual(publico.cuerpo.insumos.length, S.insumos.length);
      assert.strictEqual(publico.cuerpo.regiones.length, S.regiones.length);
      assert.ok(/referencia/i.test(publico.cuerpo.aviso) && /cotizaci/i.test(publico.cuerpo.aviso),
        "la respuesta debe advertir que son precios de referencia, no cotizaciones");
      // todo insumo servido trae sus cinco precios
      for (const i of publico.cuerpo.insumos) {
        for (const reg of REGIONES) {
          assert.ok(Number(i.precios[reg]) > 0, `el insumo ${i.insumo} no trae precio en ${reg}`);
        }
      }

      /* --- consultas puntuales y sus 404 --- */
      {
        const r = await invocar(apuPublico, "/api/apu/catalogo?insumo=cemento_gris_50kg");
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.cuerpo.insumo.unidad, "saco 50 kg");
        assert.strictEqual(Object.keys(r.cuerpo.insumo.precios).length, 5);
        assert.strictEqual((await invocar(apuPublico, "/api/apu/catalogo?insumo=unicornio")).status, 404,
          "un insumo inexistente es 404, no un 200 con precio 0");

        const rr = await invocar(apuPublico, "/api/apu/catalogo?region=costa_atlantica");
        assert.strictEqual(rr.status, 200);
        assert.strictEqual(rr.cuerpo.region.factor_materiales, 1.10);
        assert.strictEqual((await invocar(apuPublico, "/api/apu/catalogo?region=marte")).status, 404);

        const ri = await invocar(apuPublico, "/api/apu/catalogo?bloque=items");
        assert.strictEqual(ri.cuerpo.items.length, S.items.length);
        assert.ok(!ri.cuerpo.insumos, "?bloque=items no debe arrastrar los insumos");
      }

      /* --- las tres funciones del encargo, leyendo Redis de verdad --- */
      {
        const p = await apuLib.obtenerPreciosInsumo(redis, "mo_oficial_construccion");
        assert.strictEqual(p.tipo, "mano_obra");
        assert.strictEqual(p.precios.bogota_sabana, 99465, "el jornal de oficial recuperado cambió sin querer");
        assert.strictEqual(await apuLib.obtenerPreciosInsumo(redis, "no_existe"), null,
          "un insumo inexistente devuelve null, jamás un objeto con ceros");

        const { items } = await apuLib.obtenerItems(redis);
        assert.strictEqual(items.length, S.items.length);
        assert.ok(items.every((i) => Array.isArray(i.insumos) && i.insumos.length),
          "obtenerItems debe devolver la composición ya parseada");

        const f = await apuLib.obtenerFactoresRegion(redis, "eje_cafetero");
        assert.strictEqual(f.factor_mano_obra, 0.93);
        assert.strictEqual(f.prestacional_tipico, 1.55, "el factor prestacional recuperado es 1,55");
        assert.strictEqual(await apuLib.obtenerFactoresRegion(redis, "marte"), null);
      }

      /* --- LA INVARIANTE FUERTE: snapshot y hashes dicen LO MISMO ---
         El snapshot existe para no pagar 70 comandos por petición, pero es una
         caché: si divergiera de los hashes, ninguna de las dos vías serviría
         para verificar a la otra. Se borra el manifest, se vuelve a pedir el
         catálogo por la vía lenta y se comparan los tres bloques enteros. */
      {
        const porSnapshot = publico.cuerpo;
        await redis.del("apu:catalogo:manifest");
        const porHashes = await invocar(apuPublico, "/api/apu/catalogo");
        assert.strictEqual(porHashes.cuerpo.via, "hashes", "sin manifest hay que caer a los hashes y decirlo");
        const orden = (xs, k) => [...xs].sort((a, b) => String(a[k]).localeCompare(String(b[k])));
        assert.deepStrictEqual(orden(porHashes.cuerpo.insumos, "insumo"), orden(porSnapshot.insumos, "insumo"),
          "el snapshot y los hashes discrepan en los insumos");
        assert.deepStrictEqual(orden(porHashes.cuerpo.items, "codigo"), orden(porSnapshot.items, "codigo"),
          "el snapshot y los hashes discrepan en los ítems");
        assert.deepStrictEqual(orden(porHashes.cuerpo.regiones, "region"), orden(porSnapshot.regiones, "region"),
          "el snapshot y los hashes discrepan en las regiones");

        // un snapshot RANCIO (de otra versión) no se sirve: se cae a los hashes
        await invocar(apuCargar, "/api/admin/apu/cargar-catalogo?forzar=true", CAB_TOKEN, { metodo: "POST" });
        const man = JSON.parse(await redis.get("apu:catalogo:manifest"));
        await redis.set("apu:catalogo:manifest", JSON.stringify({ ...man, version: "sello-viejo" }));
        assert.strictEqual((await invocar(apuPublico, "/api/apu/catalogo")).cuerpo.via, "hashes",
          "un snapshot de otra versión NO puede servirse: sería el catálogo anterior");

        // y un chunk corrupto tampoco tumba la consulta
        await invocar(apuCargar, "/api/admin/apu/cargar-catalogo?forzar=true", CAB_TOKEN, { metodo: "POST" });
        await redis.set("apu:catalogo:chunk:0", "esto-no-es-deflate-base64");
        const conCorrupto = await invocar(apuPublico, "/api/apu/catalogo");
        assert.strictEqual(conCorrupto.status, 200, "un chunk corrupto no puede tumbar el catálogo");
        assert.strictEqual(conCorrupto.cuerpo.via, "hashes");
        assert.strictEqual(conCorrupto.cuerpo.items.length, S.items.length);
        // dejarlo sano para lo que venga después
        await invocar(apuCargar, "/api/admin/apu/cargar-catalogo?forzar=true", CAB_TOKEN, { metodo: "POST" });
      }

      /* --- GET del endpoint protegido: estado, sin escribir --- */
      {
        const r = await invocar(apuCargar, "/api/admin/apu/cargar-catalogo", CAB_TOKEN);
        assert.strictEqual(r.status, 200);
        /* `cargado` es el BOOLEANO «¿está cargado?» y `cargado_el` la marca de
           tiempo. Con los dos llamándose igual, el spread de la meta pisaba al
           booleano con una cadena —siempre veraz— y el panel habría dicho «sí»
           aunque no lo estuviera. Es el mismo choque de nombres que
           `total_procesos`/`procesos_contados`, y esta es su cerradura. */
        assert.strictEqual(typeof r.cuerpo.cargado, "boolean",
          "«cargado» tiene que seguir siendo booleano: la fecha va en «cargado_el»");
        assert.strictEqual(r.cuerpo.cargado, true);
        assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(r.cuerpo.cargado_el), "«cargado_el» debe ser la fecha ISO de la carga");
        assert.strictEqual(r.cuerpo.desactualizado, false, "recién cargado no puede estar desactualizado");
        assert.strictEqual(r.cuerpo.version_catalogo, S._meta.version);
        assert.strictEqual((await invocar(apuCargar, "/api/admin/apu/cargar-catalogo?token=malo")).status, 401,
          "el GET del endpoint de carga también exige token");
        // método no soportado
        assert.strictEqual((await invocar(apuCargar, "/api/admin/apu/cargar-catalogo", CAB_TOKEN,
          { metodo: "DELETE" })).status, 405);
      }

      console.log(`  · catálogo APU: ${carga.cuerpo.insumos} insumos × ${REGIONES.length} regiones, `
        + `${carga.cuerpo.items} ítems (${carga.cuerpo.chunks} chunk, ${carga.cuerpo.bytes_snapshot} B comprimidos) · `
        + "snapshot ≡ hashes, rancio y corrupto caen a hashes");
    }

    /* ═══════════ j-bis. RENTABILIDAD del proceso y badge «APU listo» ═══════════
       Lo que el editor de APU no respondía: cuánto vale la oportunidad y si la
       empresa puede ejecutarla. La acción `rentabilidad` es la única del módulo
       que toca la RED —el índice de baja y el de competencia—, y de ahí que vaya
       aparte de `calcular`, que es aritmética pura.

       El caso es el del encargo: «MEJORAMIENTO DE VÍA TERCIARIA EN EL MUNICIPIO
       DE JERICÓ, ANTIOQUIA», con una entidad que SÍ tiene histórico en el corpus
       sintético — con una que no lo tuviera, el ajuste competitivo saldría
       `sin_dato` y la prueba no comprobaría nada del índice. */
    {
      const apuR = require("../api/apu/[accion].js");
      const rent = require("../lib/apu/rentabilidad.js");
      const tipR = require("../lib/apu/tipologias.js");

      const ITEMS = tipR.itemsDeTipologia("VIA-PH").map((c) => ({
        item_id: c, cantidad: c === "INV-PH.1" ? 2700 : (c === "INV-640.1" ? 18000 : 600),
      }));
      const CUERPO = {
        items: ITEMS,
        departamento: "Antioquia",
        config: { aiu_pct: 28, imprevistos_pct: 5, utilidad_pct: 7 },
        entidad: "GOBERNACIÓN DEL TOLIMA",
        entidad_nit: "800100002",
        unspsc: "V1.72141000",
        cuantia: 1500000000,
        plazo_meses: 8,
        perfil: "helder",
      };

      // la acción nueva exige token como las demás (publica la baja de mercado)
      assert.strictEqual((await invocar(apuR, "/api/apu/rentabilidad", {}, { metodo: "POST", body: {} })).status, 401,
        "/api/apu/rentabilidad sirvió sin token");

      const r = await invocar(apuR, "/api/apu/rentabilidad", CAB_TOKEN, { metodo: "POST", body: CUERPO });
      assert.strictEqual(r.status, 200, `rentabilidad falló: ${JSON.stringify(r.cuerpo).slice(0, 300)}`);
      const c = r.cuerpo;

      /* ---- los seis indicadores que pide el encargo ---- */
      const ren = c.rentabilidad;
      for (const campo of ["precio_total", "costo_directo", "margen_bruto_pct", "veg", "k_max"]) {
        assert.ok(ren[campo] != null, `falta el indicador «${campo}»`);
      }
      assert.ok("payback_meses" in ren, "el payback tiene que viajar aunque sea null (no retorna en el horizonte)");
      assert.strictEqual(ren.precio_total, c.presupuesto.resumen.precio_final,
        "el precio de la rentabilidad tiene que ser EL MISMO que el del presupuesto: dos cifras del mismo "
        + "número que discrepan es el defecto que este repositorio ya pagó dos veces");
      assert.strictEqual(ren.costo_directo, c.presupuesto.resumen.costo_directo_total);
      assert.strictEqual(ren.margen_bruto_pct,
        Math.round((ren.precio_total - ren.costo_directo) * 1e4 / ren.precio_total) / 100);

      /* ---- el mercado se consulta de verdad ---- */
      assert.ok(c.mercado.disponible, "el mercado debía consultarse: hay Redis y hay índices");
      assert.ok(c.baja_mercado, "la baja de mercado tiene que viajar");
      assert.ok(c.competencia_entidad, "y la competencia de la entidad también");
      if (c.ajuste_competitivo.aplicable) {
        assert.strictEqual(c.ajuste_competitivo.precio_sugerido,
          Math.round(CUERPO.cuantia * (1 - c.ajuste_competitivo.baja_mediana_pct / 100)),
          "el sugerido es el presupuesto oficial descontado la baja mediana, exactamente");
        assert.ok(c.ajuste_competitivo.granularidad_utilizada, "una cifra sin su origen no se puede discutir");
      } else {
        assert.strictEqual(c.ajuste_competitivo.precio_sugerido, null,
          "sin base de baja no puede haber precio sugerido: sin dato NO es «no descuenta nada»");
      }
      assert.ok(c.precio_piso && c.precio_piso.precio_piso_decision > 0,
        "el precio piso es una salida visible, junto al presupuesto oficial");
      assert.strictEqual(c.precio_piso.precio_piso_decision, c.precio_piso.escenarios.sigma_15.precio_piso,
        "el piso que decide es el del escenario alto: usar el bajo sin calibrar es anti-conservador");

      /* ---- honestidad del dato ---- */
      assert.strictEqual(ren.margen_es_cota_superior, true,
        "sin `deducciones_pct` del pliego el margen es una COTA SUPERIOR y hay que decirlo");
      assert.strictEqual(ren.flujo.anticipo_es_dato, false,
        "sin anticipo declarado, `anticipo_pct = 0` es AUSENCIA DE DATO");
      assert.ok(ren.flujo.nota_anticipo.includes("AUSENCIA DE DATO"));
      assert.ok(ren.advertencias.length > 0, "un resultado sin advertencias, con este catálogo, sería una mentira");

      /* ---- las monotonías del anexo A.4, sobre el módulo ---- */
      {
        const base = {
          valor_contrato: 1200e6, costo_total: 860e6, plazo_meses: 8, costo_indirecto: 100e6,
        };
        const sin = rent.flujoCaja({ ...base, anticipo_pct: 0 });
        const con = rent.flujoCaja({ ...base, anticipo_pct: 30, anticipo_es_dato: true });
        assert.ok(con.k_max <= sin.k_max, "A.9: si el anticipo sube, K_max NO puede subir");
        assert.ok(rent.flujoCaja({ ...base, dso_dias: 150 }).costo_financiero
          >= rent.flujoCaja({ ...base, dso_dias: 60 }).costo_financiero,
          "A.12: si el DSO sube, C_financiero NO puede bajar");
        // el payback exige haber estado EXPUESTO: con anticipo, el mes 1 en
        // positivo es dinero de la entidad, no capital devuelto
        assert.ok(sin.payback_meses === null || sin.payback_meses > 1,
          "el payback no puede ser el mes 1 por el propio anticipo");

        // A.10 con el `p_base` de VERDAD, que es donde vive el efecto de nivel
        const comun = {
          baja_mediana_pct: 8, baja_p25: 5, baja_p75: 12, baja_ofertada_pct: 8,
        };
        const pocos = rent.pGanarPorPrecio({ ...comun, p_base: 1 / 4, oferentes: 3 });
        const muchos = rent.pGanarPorPrecio({ ...comun, p_base: 1 / 15, oferentes: 14 });
        assert.ok(muchos.p < pocos.p, "A.10: si suben los oferentes, P(ganar) NO puede subir");
        assert.strictEqual(pocos.multiplicador, 1,
          "ofertar en la mediana devuelve EXACTAMENTE la probabilidad base, o /api/apu y /api/oportunidades "
          + "publicarían dos cifras distintas del mismo proceso");
        assert.strictEqual(pocos.oferentes_forma, rent.N_REFERENCIA_CURVA,
          "la FORMA de la curva usa un n de referencia fijo; el NIVEL lo pone p_base");
        // la sigmoide del régimen «menor valor» sí crece con la baja…
        const arriba = rent.pGanarPorPrecio({ ...comun, baja_ofertada_pct: 20, p_base: 0.2, oferentes: 6 });
        const abajo = rent.pGanarPorPrecio({ ...comun, baja_ofertada_pct: 2, p_base: 0.2, oferentes: 6 });
        assert.ok(arriba.p_menor_valor > abajo.p_menor_valor,
          "bajo «menor valor» más baja tiene que dar más probabilidad: esa es la sigmoide");
        // …y el régimen central es una campana: alejarse del centro RESTA
        const centro = rent.pGanarPorPrecio({ ...comun, p_base: 0.2, oferentes: 6 });
        assert.ok(centro.p_central > arriba.p_central && centro.p_central > abajo.p_central,
          "bajo métodos centrales alejarse del centro resta, se aleje hacia donde se aleje");
        assert.ok(centro.supuesto.includes("25 %"), "la mezcla tiene que declarar su supuesto");
        // sin mediana de mercado NO se modula: sin dato no es «baja 0 %»
        assert.strictEqual(rent.pGanarPorPrecio({ p_base: 0.2, baja_ofertada_pct: 8 }).modulada, false);
        // la maldición del ganador crece con los oferentes y con σ
        assert.ok(rent.primaMaldicion(1000e6, 12).valor > rent.primaMaldicion(1000e6, 3).valor,
          "A.10: si suben los oferentes, MG(n) NO puede bajar");
        assert.ok(rent.primaMaldicion(1000e6, 6, { sigma_est: 0.15 }).valor
          > rent.primaMaldicion(1000e6, 6, { sigma_est: 0.08 }).valor);
        assert.strictEqual(rent.primaMaldicion(1000e6, null).estimado, true,
          "sin dato de competencia no se puede suponer que hay pocos rivales");
      }

      /* ---- el borrador se asocia al PROCESO, que es lo que enciende el badge ---- */
      {
        const ID_PROCESO = "CO1.APU.JERICO";
        const guardar = await invocar(apuR, "/api/apu/guardar", CAB_TOKEN, {
          metodo: "POST",
          body: {
            id: "jerico-ph", perfil: "helder", nombre: "Placa huella Jericó",
            objeto: "MEJORAMIENTO DE VÍA TERCIARIA EN EL MUNICIPIO DE JERICÓ, ANTIOQUIA",
            departamento: "Antioquia", entidad: CUERPO.entidad,
            id_proceso: ID_PROCESO, items: ITEMS, config: CUERPO.config,
            total: c.presupuesto.resumen.precio_final,
          },
        });
        assert.strictEqual(guardar.status, 200, `no se pudo guardar: ${JSON.stringify(guardar.cuerpo).slice(0, 200)}`);

        const listado = await invocar(apuR, "/api/apu/listar?perfil=helder", CAB_TOKEN);
        assert.strictEqual(listado.status, 200);
        assert.ok(listado.cuerpo.procesos_con_presupuesto.includes(ID_PROCESO),
          "el listado tiene que decir QUÉ PROCESOS tienen borrador: es lo que enciende «APU listo» en el panel");
        const ficha = listado.cuerpo.presupuestos.find((x) => x.id === "jerico-ph");
        assert.strictEqual(ficha.id_proceso, ID_PROCESO, "la ficha del listado tiene que llevar su proceso");

        // EL BORRADOR ES POR PERFIL: el de Helder no puede salir por Génesis
        const otro = await invocar(apuR, "/api/apu/listar?perfil=genesis", CAB_TOKEN);
        assert.strictEqual(otro.cuerpo.procesos_con_presupuesto.length, 0,
          "un borrador de un perfil NO puede aparecer en el listado de otro");

        // se limpia: el paso h-bis comprueba que una carga rechazada no deja
        // nada escrito en `apu:*`, y un borrador de aquí se lo llevaría por delante
        const mios = await redis.scan("apu:presupuesto:*");
        if (mios.length) await redis.del(...mios);
      }

      /* ---- el panel entrega lo que el botón «APU» necesita para precargar ---- */
      {
        const res = await invocar(resumen, "/api/resumen?perfil=helder", CAB_TOKEN);
        assert.strictEqual(res.status, 200);
        const dest = res.cuerpo.procesos_destacados || [];
        assert.ok(dest.length > 0, "sin destacados no se puede comprobar la precarga del botón APU");
        for (const p of dest) {
          for (const campo of ["nit_entidad", "departamento_entidad", "unspsc", "plazo_meses"]) {
            assert.ok(campo in p, `el destacado no trae «${campo}» y el botón APU no podría precargar el editor`);
          }
        }
        assert.ok(dest.some((p) => p.departamento_entidad),
          "al menos un destacado tiene que traer departamento, o los factores de precio no se precargarían nunca");
      }

      console.log(`  · rentabilidad APU: margen bruto ${ren.margen_bruto_pct} % · P(ganar) ${ren.p_ganar} · `
        + `VEG ${Math.round((ren.veg || 0) / 1e6)} M · K_max ${Math.round(ren.k_max / 1e6)} M · `
        + `payback ${ren.payback_meses ?? "—"} · badge por proceso verificado`);
    }

    /* ═══════════ j-ter. OPTIMIZADOR DE PRECIO DE OFERTA ═══════════
       El paso que convierte la inteligencia de datos en una decisión: hasta
       ahora la app publicaba la baja mediana y el contratista decidía a ojo
       cuánto descontar. `lib/apu/optimizador` barre el rango de bajas
       plausibles y devuelve el precio que MAXIMIZA el valor esperado.

       Lo que de verdad puede romperse aquí no es la aritmética del barrido sino
       tres confusiones, y las tres tienen su prueba:
         (1) DOS DESCUENTOS QUE NO SON EL MISMO NÚMERO — la baja contra el
             presupuesto oficial (la del mercado) y la perilla del editor
             (contra el precio de venta). En el corpus el precio de venta es el
             69 % de la cuantía: confundirlas mueve el precio un tercio.
         (2) DOS CÁLCULOS DE LA MISMA CIFRA — el punto de la curva evaluado en
             el precio vigente tiene que reproducir EXACTAMENTE el bloque de
             rentabilidad, y el punto en la mediana del mercado tiene que
             devolver EXACTAMENTE la `p` que ya publica /api/oportunidades.
         (3) UNA RECOMENDACIÓN FABRICADA — sin centro de mercado no puede salir
             un «óptimo»: sin dato NO es «baja del 0 %». */
    {
      const apuO = require("../api/apu/[accion].js");
      const opti = require("../lib/apu/optimizador.js");
      const tipO = require("../lib/apu/tipologias.js");
      const { calcularPresupuesto } = require("../lib/apu/calculo.js");

      const ITEMS_O = tipO.itemsDeTipologia("VIA-PH").map((c) => ({
        item_id: c, cantidad: c === "INV-PH.1" ? 2700 : (c === "INV-640.1" ? 18000 : 600),
      }));
      const CFG_O = { aiu_pct: 28, imprevistos_pct: 5, utilidad_pct: 7 };
      const cuerpoCon = (extra) => ({
        items: ITEMS_O, departamento: "Antioquia", config: CFG_O,
        entidad: "GOBERNACIÓN DEL TOLIMA", entidad_nit: "800100002",
        unspsc: "V1.72141000", plazo_meses: 8, perfil: "helder",
        id_proceso: "CO1.APU.JERICO", ...extra,
      });

      /* ---- j-ter.1 · el caso holgado: la cuantía por encima del APU ---- */
      const rr = await invocar(apuO, "/api/apu/rentabilidad", CAB_TOKEN,
        { metodo: "POST", body: cuerpoCon({ cuantia: 1500000000 }) });
      assert.strictEqual(rr.status, 200, `optimizador falló: ${JSON.stringify(rr.cuerpo).slice(0, 300)}`);
      const co = rr.cuerpo;
      const o = co.optimizador;
      assert.ok(o, "/api/apu/rentabilidad no trae el bloque «optimizador»");
      assert.strictEqual(o.aplicable, true,
        `el optimizador debía aplicar (hay baja, cuantía y costo directo): ${o.motivo} — ${o.mensaje}`);
      assert.strictEqual(o.id_proceso, "CO1.APU.JERICO", "el id del proceso viaja y vuelve");

      const mediana = o.centro_mercado.baja_mediana_pct;
      assert.ok(Number.isFinite(mediana), "sin mediana no hay centro de mercado y no debería haber curva");

      /* La rejilla del encargo: 0,5 pp de paso, −10/+5 pp alrededor de la
         mediana, RECORTADA en 0 — un descuento negativo es un precio POR ENCIMA
         del presupuesto oficial, y eso no se evalúa: descalifica la oferta. */
      assert.strictEqual(o.rango.paso_pct, 0.5, "el paso de la rejilla es 0,5 pp");
      assert.strictEqual(o.rango.pedido_desde_pct, mediana - 10, "el rango pedido arranca 10 pp bajo la mediana");
      assert.strictEqual(o.rango.hasta_pct, mediana + 5, "…y termina 5 pp por encima");
      assert.strictEqual(o.rango.desde_pct, Math.max(0, mediana - 10), "la rejilla se recorta en descuento 0");
      assert.strictEqual(o.rango.recortado_en_cero, mediana - 10 < 0);
      assert.strictEqual(o.curva.length, o.rango.puntos);
      assert.strictEqual(o.curva.length,
        Math.round((o.rango.hasta_pct - o.rango.desde_pct) / o.rango.paso_pct) + 1);
      for (const p of o.curva) {
        assert.ok(p.descuento >= 0, "ningún punto puede ofertar por encima del presupuesto oficial");
      }

      /* ---- j-ter.2 · el precio se DERIVA del descuento, y el margen del precio ---- */
      const CD = co.presupuesto.resumen.costo_directo_total;
      for (const p of o.curva) {
        assert.strictEqual(p.precio, Math.round(1500000000 * (1 - p.descuento / 100)),
          `el precio del punto ${p.descuento} % no es la cuantía descontada esa baja`);
        assert.strictEqual(p.margen, p.precio - CD,
          "«margen» es precio − costo directo total, exactamente como lo pidió el encargo");
        assert.strictEqual(p.veg_margen_bruto, Math.round(p.probabilidad * p.margen),
          "la fórmula literal del encargo se publica al lado de la que decide");
      }
      // monotonías que NO dependen del modelo: más descuento ⇒ menos precio y
      // menos margen. Si alguna se rompiera, el barrido estaría mal ordenado.
      for (let i = 1; i < o.curva.length; i++) {
        assert.ok(o.curva[i].descuento > o.curva[i - 1].descuento, "la rejilla tiene que ir en orden");
        assert.ok(o.curva[i].precio < o.curva[i - 1].precio, "más descuento no puede dar más precio");
        assert.ok(o.curva[i].margen < o.curva[i - 1].margen, "más descuento no puede dar más margen");
      }
      /* Y una que SÍ depende del modelo, pero solo donde es demostrable: por
         DEBAJO de la mediana las dos mitades de la mezcla crecen con la baja
         (la sigmoide de «menor valor» y el lado izquierdo de la campana), así
         que la probabilidad no puede bajar. Por encima de la mediana la mezcla
         deja de ser monótona a propósito —esa es toda la tesis del módulo— y
         exigirlo ahí sería exigir que ofertar más barato siempre gane más. */
      const izquierda = o.curva.filter((p) => p.descuento <= mediana);
      for (let i = 1; i < izquierda.length; i++) {
        assert.ok(izquierda[i].probabilidad >= izquierda[i - 1].probabilidad,
          `por debajo del centro del mercado la probabilidad no puede caer al descontar más `
          + `(${izquierda[i - 1].descuento} % → ${izquierda[i].descuento} %)`);
      }

      /* ---- j-ter.3 · NO ES UN SEGUNDO CÁLCULO ----
         Las dos igualdades que atan el optimizador al resto de la app. Si
         divergieran, la app recomendaría un precio con una cuenta y enseñaría
         su margen con otra — el defecto que este repositorio ya pagó dos veces. */
      const centro = o.curva.find((p) => p.descuento === mediana);
      assert.ok(centro, "la mediana del mercado tiene que caer en la rejilla");
      assert.strictEqual(centro.probabilidad, co.p_ganar_base.p,
        "ofertar en la mediana del mercado tiene que devolver EXACTAMENTE la probabilidad que publica "
        + "/api/oportunidades: el multiplicador de precio está normalizado a 1 ahí");
      const act = o.punto_actual;
      assert.ok(act, "el punto vigente tiene que viajar: es lo que hace accionable la recomendación");
      assert.strictEqual(act.precio, co.presupuesto.resumen.precio_final);
      assert.strictEqual(act.veg, co.rentabilidad.veg,
        "el punto vigente de la curva y el bloque de rentabilidad son la MISMA cuenta");
      assert.strictEqual(act.probabilidad, co.rentabilidad.p_ganar);
      assert.strictEqual(act.margen, co.rentabilidad.margen_bruto_cop);
      assert.strictEqual(act.k_max, co.rentabilidad.k_max);

      /* ---- j-ter.4 · el óptimo es el máximo de VERDAD, y las tres opciones ---- */
      const vegMax = Math.max(...o.curva.map((p) => p.veg));
      assert.strictEqual(o.optimo.veg, vegMax, "el «óptimo» tiene que ser el máximo de la curva publicada");
      assert.strictEqual(o.precio_optimo, o.optimo.precio);
      assert.strictEqual(o.descuento_optimo_pct, o.optimo.descuento);
      assert.strictEqual(o.veg_optimo, o.optimo.veg);
      assert.strictEqual(o.probabilidad_optima, o.optimo.probabilidad);
      const op = o.opciones;
      assert.ok(op.conservador.descuento <= op.optimo.descuento
        && op.optimo.descuento <= op.agresivo.descuento,
        "conservador ≤ óptimo ≤ agresivo en descuento, por construcción");
      assert.ok(op.conservador.margen >= op.optimo.margen && op.optimo.margen >= op.agresivo.margen,
        "el conservador es el de MÁS margen y el agresivo el de menos: si no, las etiquetas mienten");
      // las tres viven dentro de la meseta declarada: no son un ±N pp inventado
      const umbral = o.optimo.veg - Math.abs(o.optimo.veg) * (op.meseta.tolerancia_pct / 100);
      for (const k of ["conservador", "optimo", "agresivo"]) {
        assert.ok(op[k].veg >= umbral,
          `la opción «${k}» está fuera de la meseta del ${op.meseta.tolerancia_pct} %`);
      }
      assert.strictEqual(op.meseta.desde_pct, op.conservador.descuento);
      assert.strictEqual(op.meseta.hasta_pct, op.agresivo.descuento);
      assert.strictEqual(op.meseta.colapsada,
        op.conservador.descuento === op.agresivo.descuento);

      /* ---- j-ter.5 · LOS DOS DESCUENTOS NO SON EL MISMO NÚMERO ----
         Aquí el precio de venta del APU es ~69 % de la cuantía, así que el
         precio óptimo cae POR ENCIMA de él: no hay descuento que aplicar, y
         decir que sí dejaría al botón produciendo un precio distinto del
         recomendado. Es el caso que el encargo no contemplaba. */
      assert.ok(co.presupuesto.resumen.precio_venta < 1500000000,
        "el fixture tiene que dejar el precio de venta por debajo de la cuantía, o no prueba nada");
      assert.ok(o.optimo.descuento_apu_pct < 0 && o.optimo.aplicable_al_apu === false,
        "con la cuantía muy por encima del APU, el «descuento» del editor sale negativo y NO es aplicable");
      assert.strictEqual(o.optimo.precio_apu_resultante, null,
        "sin descuento aplicable no puede publicarse un precio resultante");
      assert.ok(o.alertas.some((a) => /POR ENCIMA de su precio de venta/.test(a)),
        "y hay que DECIRLO, no dejar el botón muerto");

      /* ---- j-ter.6 · el caso ajustado: la cuantía por debajo del APU ----
         Aquí sí hay descuento que aplicar, y se comprueba el VIAJE DE IDA Y
         VUELTA por los handlers reales: la perilla que publica el optimizador,
         metida en /api/apu/calcular, tiene que dar EXACTAMENTE el precio que el
         optimizador prometió. */
      const rr2 = await invocar(apuO, "/api/apu/rentabilidad", CAB_TOKEN,
        { metodo: "POST", body: cuerpoCon({ cuantia: 1000000000 }) });
      assert.strictEqual(rr2.status, 200);
      const o2 = rr2.cuerpo.optimizador;
      assert.strictEqual(o2.aplicable, true);
      const aplicables = o2.curva.filter((p) => p.aplicable_al_apu);
      assert.ok(aplicables.length > 0,
        "con la cuantía por debajo del precio de venta tiene que haber puntos aplicables al APU");
      for (const p of aplicables) {
        assert.ok(p.descuento_apu_pct >= 0 && p.descuento_apu_pct <= opti.FACTOR_BAJA_MAX,
          "la perilla del editor solo admite entre 0 % y 60 %");
      }
      {
        const p = aplicables[0];
        const rec = await invocar(apuO, "/api/apu/rentabilidad", CAB_TOKEN, {
          metodo: "POST",
          body: cuerpoCon({
            cuantia: 1000000000,
            config: { ...CFG_O, aplicar_ajuste_competitivo: true, factor_baja: p.descuento_apu_pct },
          }),
        });
        assert.strictEqual(rec.status, 200);
        const final = rec.cuerpo.presupuesto.resumen.precio_final;
        assert.strictEqual(final, p.precio_apu_resultante,
          "«precio_apu_resultante» promete lo que va a salir del editor al pulsar Aplicar: si no cuadra al "
          + "céntimo, el botón entrega un precio distinto del recomendado y nadie se entera");
        assert.ok(Math.abs(final - p.precio) <= p.precio * 0.0001,
          "…y ese precio tiene que quedar a menos de un 0,01 % del recomendado (el resto es el redondeo "
          + "a los dos decimales que se pueden teclear en la perilla)");

        /* EL PRECIO CON DECIMALES, que es donde se rompería la igualdad. Con
           una baja aplicada, `precio_final` sale con dos decimales; si el punto
           vigente lo redondeara al peso para evaluarlo, dejaría de reproducir
           el bloque de rentabilidad — y esa igualdad es lo único que garantiza
           que la recomendación y el margen que se enseña son la MISMA cuenta. */
        assert.notStrictEqual(final % 1, 0,
          "este caso tiene que dejar el precio final con decimales, o no prueba el redondeo");
        const actual2 = rec.cuerpo.optimizador.punto_actual;
        assert.strictEqual(actual2.precio, final, "el punto vigente evalúa el precio TAL CUAL, sin redondear");
        assert.strictEqual(actual2.veg, rec.cuerpo.rentabilidad.veg);
        assert.strictEqual(actual2.probabilidad, rec.cuerpo.rentabilidad.p_ganar);
        assert.strictEqual(actual2.margen, rec.cuerpo.rentabilidad.margen_bruto_cop);
      }

      /* ---- j-ter.6-bis · un máximo INTERIOR, que es donde las tres opciones
         significan algo ----
         En los dos casos de arriba el máximo cae en un extremo del rango: es
         real (con esa cuantía el margen aguanta cualquier baja plausible) pero
         deja sin ejercitar la meseta. Con una cuantía intermedia la curva sube
         y vuelve a bajar, y ahí conservador / óptimo / agresivo son tres puntos
         distintos con las tres propiedades que el encargo les atribuye. */
      {
        const presI = calcularPresupuesto({ items: ITEMS_O, departamento: "Antioquia", config: CFG_O });
        const oi = opti.optimizarPrecioOferta(
          {
            presupuesto_oficial: 1150000000, p_base: 0.25,
            baja: { nivel: "alto", baja_mediana: 8, baja_p25: 5, baja_p75: 12, procesos_contados: 40 },
            precio_venta: presI.resumen.precio_venta, precio_actual: presI.resumen.precio_final,
          },
          presI.resumen.costo_directo_total, {},
        );
        assert.strictEqual(oi.rango.optimo_en_el_borde, null, "este caso tiene el máximo DENTRO del rango");
        const c1 = oi.opciones.conservador, c2 = oi.opciones.optimo, c3 = oi.opciones.agresivo;
        assert.ok(c1.descuento < c2.descuento && c2.descuento < c3.descuento,
          "con máximo interior las tres opciones son tres precios distintos");
        assert.ok(c1.margen > c2.margen && c2.margen > c3.margen,
          "conservador = MÁS margen; agresivo = menos. Si no, las etiquetas mienten");
        assert.ok(c3.probabilidad > c1.probabilidad,
          "…y el agresivo compra probabilidad: es lo que el dueño está pagando con el margen");
        assert.ok(c2.veg >= c1.veg && c2.veg >= c3.veg, "el óptimo es el de más VEG de los tres");
        assert.strictEqual(oi.opciones.meseta.colapsada, false);
        assert.strictEqual(c2.perdida_veg_pct, 0, "el óptimo no pierde nada contra sí mismo");
        assert.ok(c1.perdida_veg_pct > 0 && c1.perdida_veg_pct <= oi.opciones.meseta.tolerancia_pct);
        assert.ok(c3.perdida_veg_pct > 0 && c3.perdida_veg_pct <= oi.opciones.meseta.tolerancia_pct);
        assert.strictEqual(c1.diferencia_vs_optimo.veg, c1.veg - c2.veg);
        // el VEG que DECIDE no es el del encargo: `P × margen bruto` no ha
        // pagado la contribución del 5 % ni la financiación, y por eso es mayor
        assert.ok(c2.veg_margen_bruto > c2.veg,
          "el VEG sobre margen BRUTO tiene que ser mayor que el que descuenta los costos ocultos: si "
          + "coincidieran, o no se están restando o se están restando dos veces");
      }

      /* ---- j-ter.7 · sin centro de mercado NO hay recomendación ----
         SIN DATO no es «baja del 0 %». Con la probabilidad plana el óptimo
         saldría siempre en «no descuente nada», que no es una recomendación:
         es la ausencia de una, disfrazada de consejo. */
      {
        const presO = calcularPresupuesto({ items: ITEMS_O, departamento: "Antioquia", config: CFG_O });
        const sinBaja = opti.optimizarPrecioOferta(
          {
            presupuesto_oficial: 1500000000, p_base: 0.2,
            baja: { nivel: "sin_dato", baja_mediana: null, procesos_contados: 0, mensaje: "Sin datos históricos de baja para esta entidad." },
            precio_venta: presO.resumen.precio_venta, precio_actual: presO.resumen.precio_final,
          },
          presO.resumen.costo_directo_total, {},
        );
        assert.strictEqual(sinBaja.aplicable, false);
        assert.strictEqual(sinBaja.motivo, "sin_centro_de_mercado");
        assert.strictEqual(sinBaja.precio_optimo, null, "sin centro de mercado no puede haber precio óptimo");
        assert.deepStrictEqual(sinBaja.curva, []);
        assert.strictEqual(sinBaja.sin_punto_rentable, null,
          "`null`, no `false`: no es que no haya precio rentable, es que no se miró ninguno");
        assert.ok(/SIN DATO no es/i.test(sinBaja.mensaje), "hay que decir por qué, no callar");

        // …y sin presupuesto oficial tampoco: «descuento» no significaría nada
        const sinPo = opti.optimizarPrecioOferta(
          { presupuesto_oficial: null, p_base: 0.2, baja: { nivel: "medio", baja_mediana: 7 } },
          presO.resumen.costo_directo_total, {},
        );
        assert.strictEqual(sinPo.aplicable, false);
        assert.strictEqual(sinPo.motivo, "sin_presupuesto_oficial");

        // …ni sin costo directo: no hay margen que optimizar
        assert.strictEqual(opti.optimizarPrecioOferta(
          { presupuesto_oficial: 1e9, p_base: 0.2, baja: { nivel: "medio", baja_mediana: 7 } }, 0, {},
        ).motivo, "sin_costo_directo");

        /* ---- j-ter.8 · EL PRECIO RECOMENDADO NO DEPENDE DEL DEFECTO CONOCIDO ----
           docs/PROBABILIDAD_MEJORADA.md §2.5c: el precio se cobra DOS VECES
           (lib/probabilidad ya multiplica por un factor de baja y aquí se vuelve
           a modular por precio). Ese factor es CONSTANTE a lo largo del barrido,
           y `argmax_d [k·f(d) − c]` no depende de `k > 0`: mueve el NIVEL del
           VEG, no el precio elegido. Decir «queda arreglado» sería falso; decir
           «invalida la recomendación» también. Esto lo demuestra. */
        const proceso = {
          presupuesto_oficial: 1500000000,
          baja: { nivel: "medio", baja_mediana: 7, baja_p25: 4, baja_p75: 12, procesos_contados: 40 },
          precio_venta: presO.resumen.precio_venta, precio_actual: presO.resumen.precio_final,
        };
        const conP = (p) => opti.optimizarPrecioOferta({ ...proceso, p_base: p },
          presO.resumen.costo_directo_total, {});
        const a = conP(0.20), b = conP(0.16);
        assert.strictEqual(a.descuento_optimo_pct, b.descuento_optimo_pct,
          "escalar la probabilidad base no puede mover el precio recomendado");
        assert.ok(b.veg_optimo < a.veg_optimo, "…pero sí baja el VEG: el nivel no es invariante, y se dice");
      }

      /* ---- j-ter.9 · el editor: recuadro, botón y la perilla correcta ---- */
      {
        const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
        const js = sinComentarios(fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8"));
        for (const debe of ["seccion-precio-sugerido", "ps-precio", "ps-descuento", "ps-veg", "ps-prob",
          "ps-opciones", "ps-curva", "btn-aplicar-descuento"]) {
          assert.ok(html.includes(`id="${debe}"`), `index.html sin #${debe}`);
        }
        assert.ok(/pintarPrecioSugerido\(c\.optimizador\)/.test(js),
          "app.js tiene que pintar el bloque «optimizador» de la respuesta");
        /* EL BOTÓN ESCRIBE LA PERILLA DEL APU, NO LA BAJA DEL MERCADO. Es la
           confusión que cuesta un tercio del precio en este mismo corpus: el
           `descuento` se mide contra el presupuesto oficial y `factor-baja` se
           aplica sobre el precio de venta. */
        assert.ok(/\$\("factor-baja"\)\.value\s*=\s*punto\.descuento_apu_pct/.test(js),
          "«Aplicar este descuento al APU» tiene que escribir `descuento_apu_pct`, no `descuento`");
        assert.ok(!/\$\("factor-baja"\)\.value\s*=\s*punto\.descuento\b/.test(js),
          "escribir la baja del mercado en la perilla del editor produciría un precio distinto del recomendado");
        // el recuadro sale SOLO tras calcular el APU cuando hay proceso asociado
        assert.ok(/if \(ok && \$\("id-proceso"\)\.value\.trim\(\)\) await calcularRentabilidad\(\{ auto: true \}\)/.test(js),
          "tras calcular el APU con proceso asociado, el precio sugerido tiene que salir solo");
        // aplicar RECALCULA: rellenar el campo y no recalcular dejaría el
        // resumen enseñando el precio anterior
        assert.ok(/async function aplicarDescuentoApu[\s\S]{0,900}await calcularApu\(\)/.test(js),
          "aplicar el descuento tiene que recalcular el presupuesto por el mismo camino que el botón");
        // el recuadro nunca queda mudo: si no hay con qué sugerir, DICE por qué
        assert.ok(/ps-sin-datos/.test(js), "el estado «no aplicable» tiene que pintarse con su motivo");
      }

      console.log(`  · optimizador de precio: ${o.curva.length} precios entre ${o.rango.desde_pct} % y `
        + `${o.rango.hasta_pct} % · óptimo ${o.descuento_optimo_pct} % → ${Math.round(o.precio_optimo / 1e6)} M `
        + `(VEG ${Math.round(o.veg_optimo / 1e6)} M, P ${o.probabilidad_optima}) · meseta `
        + `${op.meseta.desde_pct}–${op.meseta.hasta_pct} % · punto vigente ≡ bloque de rentabilidad · `
        + "perilla del APU ida y vuelta");
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

      /* ---- «OFERTAS DEL PROCESO» NO PUEDE VOLVER (ago 2026) ----
         `nivel_competencia` sale de columnas EX-POST (`respuestas_al_procedimiento`
         y equivalentes) que SECOP II solo publica cuando el proceso ya cerró. El
         corpus activo, por construcción, solo tiene procesos ABIERTOS: allí
         `primerNumero(...) ?? 0` da 0 y `nivelCompetencia(0)` da «baja» para
         TODO. La app pintaba con eso un chip VERDE en cada tarjeta y ofrecía un
         desplegable de tres opciones de las que una no filtraba nada y las otras
         dos vaciaban la lista.

         Es el mismo defecto que el proyecto ya corrigió dos veces —«0 oferentes
         = SIN DATO, no *nadie se presentó*» y «18,2 oferentes sin base»—
         sobreviviendo en el sitio que el dueño mira siempre. Quien responde esa
         pregunta CON BASE es `competencia_entidad`, del histórico, y su badge ya
         está a dos centímetros en la misma tarjeta.

         Se vigila la UI aquí y el comportamiento del servidor en el bloque de
         /api/oportunidades (el parámetro tiene que ser inerte). Ver
         docs/AUDITORIA_INTEGRAL.md §4.1. */
      assert.ok(!html.includes('id="f-competencia"'),
        "volvió el desplegable «Ofertas del proceso»: filtra por un campo que en el corpus activo vale «baja» siempre");
      assert.ok(!/Ofertas del proceso/.test(js),
        "volvió el chip «Ofertas del proceso»: es un cero ex-post disfrazado de medición");
      assert.ok(!/\bnivel_competencia\b/.test(sinComentarios(js)),
        "app.js no puede volver a leer ni a enviar `nivel_competencia`: usa `competencia_entidad`, que sí tiene base");

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

      /* ---- EL TOOLTIP DEL DESGLOSE NO PUEDE PINTAR «×null» (ago 2026) ----
         Sin token, lib/publico redacta el `factor` del ajuste por baja de
         mercado —es invertible y revelaría la mediana que `baja_mercado` acaba
         de ocultar—, así que llega en `null`. Sin guarda, el cliente PÚBLICO
         —justo para quien se abrió el endpoint— leía «baja_mercado ×null: …».
         Se comprueba con la línea real, ejecutando el mismo `map` del fuente
         sobre la salida real de `sinFinanzas`: una regex sobre el fuente diría
         que la guarda está, no que funcione. */
      {
        const { sinFinanzas } = require("../lib/publico.js");
        const { estimarPDetalle } = require("../lib/probabilidad.js");
        const detalle = estimarPDetalle({ _cierre_prorrogado: true }, {
          competencia: { nivel: "media", promedio_oferentes: 3, total_procesos: 40 },
          baja: { nivel: "medio", baja_mediana: 8, procesos_contados: 40 },
        });
        const pub = sinFinanzas({ p_ganar_detalle: detalle }).p_ganar_detalle;
        const linea = js.slice(js.indexOf("const ajustes = (d.ajustes"));
        const expr = linea.slice(linea.indexOf(".map("), linea.indexOf(".join("));
        const pintado = eval(`(${expr.slice(5, expr.lastIndexOf(")"))})`); // la lambda del fuente
        for (const a of pub.ajustes) {
          const texto = pintado(a);
          assert.ok(!/×\s*null|×\s*undefined|NaN/.test(texto),
            `el tooltip público pinta un factor vacío: «${texto}»`);
          assert.ok(texto.includes(a.nombre), "el ajuste tiene que seguir nombrándose aunque se le tape el factor");
        }
        // y con token el factor SÍ se pinta: la guarda no puede tragarse el dato
        assert.ok(/×0\.85/.test(pintado(detalle.ajustes.find((a) => a.nombre === "baja_mercado"))),
          "con el factor presente, el tooltip tiene que pintarlo");
      }
      /* …y el detalle de competencia usa el TOKEN INTEGRADO (ago 2026): el
         endpoint sigue exigiendo credencial en el servidor, pero el usuario ya
         no ve ningún formulario — `pedirToken` murió con la página única. */
      assert.ok(!/function pedirToken\(/.test(js),
        "pedirToken volvió: el token va integrado y ningún formulario debe pedirlo");
      {
        const i = js.indexOf("async function cargarDetalle");
        const cuerpo = js.slice(i, js.indexOf("\n  }", i));
        assert.ok(i > 0 && /leerToken\(\)/.test(cuerpo),
          "cargarDetalle debe mandar el token integrado: /api/competencia-detalle no se relajó");
      }

      /* LAS PÁGINAS RETIRADAS NO PUEDEN VOLVER: la app es UNA página y un
         archivo resucitado no lo cargaría nadie — quedaría desincronizado de
         app.js en silencio, que es peor que un 404. Sus URLs viejas viven como
         `redirects` en vercel.json. */
      for (const viejo of ["admin.html", "apu.html", "pliego.html", "admin.js", "apu.js"]) {
        assert.ok(!fs.existsSync(path.join(__dirname, "..", "public", viejo)),
          `public/${viejo} volvió: la app es una sola página (index.html + app.js)`);
      }

      /* panel de administración: pestaña #/admin de la MISMA página. Los
         alias conservan los nombres históricos de las variables para no tocar
         cien aserciones que siguen midiendo lo mismo. */
      const admHtml = html;
      for (const debe of ['id="tab-admin"', 'data-tab="admin"',
        'id="btn-iniciar"', 'id="btn-detener"', 'id="prog-barra"', 'id="m-tandas"', 'id="chip-texto"']) {
        assert.ok(admHtml.includes(debe), `index.html sin ${debe}`);
      }
      const admJs = js;
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
      /* EL LECTOR DE PLIEGOS SE DESPACHA DESDE `api/apu/[accion].js`, no desde
         ficheros propios, y no es una preferencia de estilo: el plan Hobby de
         Vercel admite 12 funciones por despliegue y con `extraer-texto.js` y
         `descargar.js` sueltos eran 14 — el despliegue entero se rechazaba. Si
         alguien las vuelve a sacar a `api/`, esta prueba lo dice antes de que lo
         diga Vercel. */
      {
        const despachador = fs.readFileSync(path.join(__dirname, "..", "api", "apu", "[accion].js"), "utf8");
        for (const accion of ["extraer-texto", "descargar"]) {
          assert.ok(despachador.includes(`"${accion}"`),
            `api/apu/[accion].js no registra la acción «${accion}»`);
        }
        assert.ok(/require\("\.\.\/\.\.\/lib\/apu_extraer\.js"\)/.test(despachador)
          && /require\("\.\.\/\.\.\/lib\/apu_descargar\.js"\)/.test(despachador),
          "el despachador debe delegar en lib/apu_extraer y lib/apu_descargar");
        assert.ok(!fs.existsSync(path.join(__dirname, "..", "api", "apu", "extraer-texto.js")),
          "extraer-texto volvió a ser una función propia: son 13 y el plan Hobby admite 12");
        assert.ok(!fs.existsSync(path.join(__dirname, "..", "api", "apu", "descargar.js")),
          "descargar volvió a ser una función propia: son 13 y el plan Hobby admite 12");
      }

      /* ══════ lector de pliegos PDF: sección de la pestaña APU ══════
         `pliego.js` sigue siendo un ARCHIVO propio (sus funciones están atadas
         por pruebas que las extraen por archivo) pero su marcado vive en
         index.html — dentro de la pestaña APU, plegado en un <details>. Son
         dos preguntas distintas —«¿qué dice este pliego?» y «¿cuánto cuesta
         este ítem?»— y cada una conserva su catálogo. Ver CLAUDE.md. */
      const apuHtml = html;
      const apuJs = fs.readFileSync(path.join(__dirname, "..", "public", "pliego.js"), "utf8");
      new Function(apuJs); // valida sintaxis sin ejecutar
      for (const debe of ["/pliego.js",
        'id="btn-extraer"', 'id="btn-ocr"', 'id="pliego-archivo"', 'id="pliego-url"',
        'id="r-items"', 'id="pl-prog-barra"', 'id="aviso-limitaciones"']) {
        assert.ok(apuHtml.includes(debe), `index.html sin ${debe}`);
      }
      // el gate es UNO solo y vive en app.js: pliego.js no puede llevar copia
      assert.ok(!apuJs.includes('"231105"'), "pliego.js no puede duplicar el gate: hay uno solo en app.js");
      assert.ok(/accept="\.pdf,application\/pdf"/.test(apuHtml), "el selector debe aceptar PDF");
      assert.ok(/type="url"/.test(apuHtml), "falta el campo de URL del pliego (muchos pliegos SECOP son URLs públicas)");

      /* PUNTO 4 DEL ENCARGO: las limitaciones se documentan EN LA UI, y con esa
         frase. Va en un bloque que no se puede cerrar: una advertencia que hay
         que ir a buscar no es una advertencia. */
      assert.ok(/La extracci[oó]n autom[aá]tica puede tener errores/i.test(apuHtml),
        "apu.html debe advertir que la extracción automática puede tener errores");
      assert.ok(/[Vv]erifique siempre los datos/i.test(apuHtml),
        "apu.html debe pedir verificar los datos antes de usar el APU");
      assert.ok(!/aviso-limitaciones[^>]*hidden/.test(apuHtml),
        "el bloque de limitaciones no puede nacer oculto");

      /* pdf.js SE CARGA DESDE CDN Y EN EL NAVEGADOR: es la decisión de
         arquitectura de toda la capa (pdfjs-dist en Node pesa decenas de MB y
         hay que sacarlo del request path). Si alguien lo moviera al servidor,
         esta prueba lo delata. */
      assert.ok(/pdfjsLib/.test(apuJs) && /getTextContent/.test(apuJs),
        "apu.js debe extraer el texto con pdf.js en el navegador");
      assert.ok(/workerSrc/.test(apuJs), "hay que fijar el workerSrc de pdf.js o cae a modo síncrono");
      assert.ok(/const PDFJS_VERSION = "[\d.]+"/.test(apuJs),
        "la versión de pdf.js va en una constante: actualizarla debe ser una línea");
      // el texto viaja con las COLUMNAS separadas por tabulador: es de lo que
      // depende `dividirCeldas` en el servidor
      assert.ok(/salida \+= "\\t"/.test(apuJs),
        "apu.js debe separar las columnas con TABULADOR al reconstruir las filas por coordenadas");

      /* ARRANQUE AL FINAL DEL IIFE (la lección que costó cara tres veces): el
         lector no arranca solo — expone `window.__pliegoArrancar` y la pestaña
         APU lo llama la primera vez que se abre. La exposición va al FINAL,
         después de declarar el estado que sus funciones leen. */
      {
        const iAuto = apuJs.indexOf("window.__pliegoArrancar");
        const iEstado = apuJs.indexOf("let filas = [];");
        assert.ok(iAuto > 0 && iEstado > 0, "no se encontraron el gancho de arranque y el estado del lector");
        assert.ok(iAuto > iEstado,
          "el gancho de arranque del lector se expone antes de declarar su estado: morirá en la zona muerta temporal");
      }
      // el token va integrado también aquí: ni formulario ni sessionStorage
      assert.ok(apuJs.includes('const TOKEN = "MiExtraccion2025"'), "pliego.js sin el token integrado");
      assert.ok(!/sessionStorage\.(?:get|set|remove)Item/.test(sinComentarios(apuJs)),
        "pliego.js ya no guarda nada en sessionStorage: el token va integrado y el gate es de app.js");

      for (const [archivo, fuente] of [["app.js", js], ["pliego.js", apuJs]]) {
        // `Number(x) || 0` sí es legítimo: normaliza un valor YA leído. Lo que
        // no puede haber es `i.campo || 0` a pelo sobre el conteo.
        const codigo = sinComentarios(fuente).replace(/Number\([^)]*\)\s*\|\|\s*0/g, "");
        assert.ok(!/\bi\.(?:procesos_contados|total_procesos)\s*\|\|\s*0/.test(codigo),
          `${archivo}: un conteo leído con «|| 0» convierte un campo ausente en un cero creíble`);
      }

      /* Y la versión de esa misma regla para las CANTIDADES de obra, que es
         donde más caro sale: una cantidad ausente se pinta «sin dato», nunca 0.
         Un cero inventado en una cantidad de obra es plata. */
      {
        const codigo = sinComentarios(apuJs);
        assert.ok(!/\bf\.(?:cantidad|unitario_oficial|total_oficial)\s*\|\|\s*0/.test(codigo),
          "apu.js: una cantidad leída con «|| 0» convierte «no sé» en cero");
        assert.ok(/v == null \? "" :/.test(codigo),
          "la celda de una cantidad ausente debe quedar VACÍA, no en 0");
      }

      /* LAS DOS IMPLEMENTACIONES DEL NÚMERO COLOMBIANO NO PUEDEN DIVERGIR.
         `numeroLocal` (public/apu.js) duplica a mano `numeroColombiano`
         (lib/apu_pliego): la duplicación está justificada —un <input> del
         navegador no puede requerir un módulo de Node— pero «justificada» no es
         «libre». Sin una prueba que las ate, una corrección aplicada a una sola
         hace que el número que el dueño escribe a mano y el que el servidor leyó
         del PDF signifiquen cosas distintas, y eso no se vería nunca.
         Se extrae la función del fuente y se comparan sobre la misma batería. */
      {
        const libPliego = require("../lib/apu_pliego.js");
        const i = apuJs.indexOf("function numeroLocal(");
        assert.ok(i > 0, "no se encontró numeroLocal en apu.js");
        const fin = apuJs.indexOf("\n  }", i);
        const fuenteFn = apuJs.slice(i, fin + 4);
        // eslint-disable-next-line no-new-func
        const numeroLocal = new Function(`${fuenteFn}; return numeroLocal;`)();
        const bateria = ["1.234.567,89", "1.234.567", "1.234", "1.5", "1.50", "12,5", "0,00",
          "375.0000", "3.14159", "1.2.3456", "-500", "  8.450,00  ", "2024-350", "abc", "1,2,3", "",
          "CM-001", "$ 45.000", "100", "0", "1.000.000"];
        for (const caso of bateria) {
          assert.strictEqual(numeroLocal(caso), libPliego.numeroColombiano(caso),
            `numeroLocal y numeroColombiano discrepan en ${JSON.stringify(caso)}: `
            + `${numeroLocal(caso)} vs ${libPliego.numeroColombiano(caso)}`);
        }
      }

      /* La página no puede prometer que el documento NO SALE y a la vez ofrecer
         un botón que manda sus páginas a un tercero. La excepción se declara. */
      assert.ok(/OCR\.space<\/strong>, un servicio externo/.test(apuHtml)
        || /s[íi] salen/.test(apuHtml),
        "apu.html debe advertir que la vía de OCR envía las páginas a un servicio externo");
      assert.ok(!/no se sube a ning[úu]n servidor/.test(apuHtml),
        "esa promesa es falsa mientras exista el botón de OCR: las páginas salen a OCR.space");
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
      /* EL TOKEN VA INTEGRADO (ago 2026): el usuario no ve ningún formulario
         ni mensaje de token. Un 401 del despliegue —HISTORICO_TOKEN distinto
         del integrado— se dice con esas palabras, no con «Token inválido». */
      assert.ok(!/CLAVE_TOKEN/.test(js), "la clave de sesión del token murió con el formulario");
      assert.ok(!js.includes("Guardar y ver detalle") && !/Pegue el token/.test(js),
        "reapareció el formulario del token: el usuario nunca debe teclearlo");
      assert.ok(/HISTORICO_TOKEN no coincide/.test(js),
        "un 401 debe explicarse como lo que es: el token integrado no coincide con el del despliegue");
      assert.ok(/try \{ return sessionStorage\.getItem/.test(js) || /try \{ sesionConClave = sessionStorage\.getItem/.test(js),
        "leer sessionStorage debe ir protegido: si lanza, el arranque moriría en silencio");
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

      /* ---- panel: dashboard de procesos y carga de RUP ----
         El input del RUP en JSON se llama `rup-json-archivo` desde la página
         única: `rup-archivo` es el PDF del onboarding (otra sección, otro
         formato) y dos inputs no pueden compartir id. */
      for (const debe of ['id="dashboard"', 'id="d-perfil"', 'id="btn-actualizar"', 'id="d-visibles"',
        'id="d-obra"', 'id="d-consultoria"', 'id="d-semana"', 'id="d-barras"', 'id="d-entidades"',
        'id="d-departamentos"', 'id="d-destacados"', 'id="d-meta"', 'id="d-skeleton"',
        'id="seccion-rup"', 'id="rup-json-archivo"', 'id="rup-preview"', 'id="btn-rup-cargar"',
        'id="btn-rup-cancelar"', 'id="btn-rup-descargar"', 'id="rup-actual"']) {
        assert.ok(admHtml.includes(debe), `index.html sin ${debe} (falta el dashboard o la carga de RUP)`);
      }
      // el formulario del token no existe en ninguna pestaña
      assert.ok(!admHtml.includes('id="seccion-token"') && !admHtml.includes('id="input-token-admin"'),
        "reapareció la sección del token del panel: el token va integrado");
      // las tarjetas llevan los colores del encargo y el esqueleto pulsa
      for (const debe of ["bg-blue-50", "bg-green-50", "bg-amber-50", "bg-red-50", "animate-pulse"]) {
        assert.ok(admHtml.includes(debe), `index.html sin ${debe} (tarjetas del dashboard)`);
      }
      // responsive: 2 columnas en móvil → 4 en escritorio, tablas apiladas
      assert.ok(/grid-cols-2[^"]*sm:grid-cols-4/.test(admHtml), "las tarjetas deben apilarse en 2 columnas en móvil");
      assert.ok(/lg:grid-cols-2/.test(admHtml), "las tablas laterales deben apilarse en móvil");
      // el archivo del RUP en JSON solo acepta JSON
      assert.ok(/id="rup-json-archivo"[^>]*accept="\.json/.test(admHtml), "el input del RUP en JSON debe aceptar solo .json");

      for (const debe of ["/api/resumen", "/api/admin/rup", "cache_bust", "X-Cache", "x-historico-token",
        "FileReader", "readAsText", "revokeObjectURL", "visibilityState", "dashboard_perfil"]) {
        assert.ok(admJs.includes(debe), `app.js sin ${debe} (el panel o la carga de RUP no están cableados)`);
      }
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
      // el perfil recordado se lee protegido (en modo restringido lanza)
      assert.ok(/try \{ return sessionStorage\.getItem\(CLAVE_PERFIL\)/.test(admJs),
        "leer el perfil recordado debe ir protegido: si lanza, el panel moriría en silencio");
      /* ARRANQUE PEREZOSO: el panel arranca la PRIMERA vez que se abre su
         pestaña (activarPestana → arrancarPaneles), nunca al cargar la página:
         abrir la app no puede gastar invocaciones en un panel que nadie mira. */
      assert.ok(/arrancadas\.admin\b[\s\S]{0,120}arrancarPaneles\(\)/.test(admJs),
        "el panel debe arrancar perezoso desde su pestaña, una sola vez");

      /* ---- panel: experiencia ejecutada y auditoría de cobertura ----
         El botón de validar el JSON se llama `btn-exp-validar` en la página
         única: `btn-exp-cargar` es el de la carga por CSV (onboarding.js), y
         dos botones no pueden compartir id. Ídem `exp-json-mensaje`. */
      for (const debe of ['id="seccion-experiencia"', 'id="exp-json"', 'id="btn-exp-validar"',
        'id="btn-exp-confirmar"', 'id="btn-exp-cancelar"', 'id="btn-exp-descargar"',
        'id="exp-preview"', 'id="exp-actual"', 'id="exp-json-mensaje"', 'id="exp-errores"',
        'id="seccion-cobertura"', 'id="c-perfil"', 'id="c-usar-experiencia"', 'id="btn-cobertura"',
        'id="btn-cobertura-exportar"', 'id="c-faltantes"', 'id="c-criticos"', 'id="c-altos"',
        'id="c-medios"', 'id="c-bajos"', 'id="c-alerta"', 'id="c-skeleton"', 'id="c-excluidos"']) {
        assert.ok(admHtml.includes(debe), `index.html sin ${debe} (falta la experiencia o la auditoría de cobertura)`);
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
      /* ---- panel: PUESTA EN PRODUCCIÓN SIN TERMINAL ----
         El dueño no tiene terminal. Los tres pasos de `cargar_experiencia.sh`
         tienen que poder darse con clics, y —lo que de verdad importa— sin
         reimplementar ninguno de los tres. */
      {
        for (const debe of ['id="exp-produccion"', 'id="btn-exp-cadena"', 'id="btn-exp-repo"',
          'id="btn-exp-cobertura"', 'id="btn-exp-full"', 'id="seccion-sync"']) {
          assert.ok(admHtml.includes(debe), `index.html sin ${debe} (falta la puesta en producción sin terminal)`);
        }
        /* SIEMPRE VISIBLE desde el token integrado: la condición «hay token»
           es verdadera por construcción, así que `pintarEstadoToken` murió y
           un bloque que naciera oculto no lo desocultaría nadie. */
        const iProd = admHtml.indexOf('id="exp-produccion"');
        assert.ok(!/\bhidden\b/.test(admHtml.slice(iProd, admHtml.indexOf(">", iProd) + 1)),
          "el bloque de puesta en producción nacería oculto y ya no existe pintarEstadoToken para enseñarlo");
        const admJsLimpio = sinComentarios(admJs);
        assert.ok(!/pintarEstadoToken/.test(admJsLimpio),
          "pintarEstadoToken volvió: con el token integrado no hay estado de token que pintar");

        /* NO SE REIMPLEMENTA NADA. Los tres pasos llaman a lo que ya existía:
           el endpoint de la carga manual con otro origen, la misma
           `ejecutarAuditoria` del botón de cobertura y el mismo `iniciarFull`
           del encadenado. Una segunda copia de la full es donde se rompería la
           invariante «1.ª tanda full, siguientes auto» sin que nadie lo notara. */
        assert.ok(admJsLimpio.includes("/api/admin/experiencia?origen=repositorio"),
          "el botón debe llamar al endpoint existente con ?origen=repositorio, no a una ruta nueva");
        /* Y POR POST: un GET a esa URL es un 405 (y antes era un 200 que no
           cargaba nada). Sin esta aserción, cambiar el método sobrevivía la
           suite entera. */
        {
          const i = admJsLimpio.indexOf("/api/admin/experiencia?origen=repositorio");
          assert.ok(/method:\s*"POST"/.test(admJsLimpio.slice(i, i + 200)),
            "la carga desde el repositorio tiene que ir por POST: un GET no escribe nada");
        }
        /* El muro del edge devuelve HTML, así que `r.json()` LANZA: con el
           parseo dentro del mismo try que el fetch, Password Protection se
           diagnostica como «sin conexión», que es lo contrario de la verdad. */
        assert.ok(/Password Protection[\s\S]{0,200}reintente/.test(admJsLimpio)
          || /(401\/403)/.test(admJsLimpio),
          "el rechazo del edge tiene que nombrarse, no confundirse con una caída de red");
        /* Cargar experiencia nueva invalida lo pintado: una auditoría medida
           contra el vocabulario anterior al lado de «106 contratos cargados» es
           una cifra vieja con aspecto de nueva. */
        {
          const i = admJsLimpio.indexOf("async function cargarExperienciaDelRepositorio");
          const cuerpo = admJsLimpio.slice(i, admJsLimpio.indexOf("\n  }", i));
          assert.ok(/invalidarCoberturaPintada\(/.test(cuerpo),
            "tras recargar la experiencia hay que invalidar la auditoría pintada");
        }
        assert.ok(/function iniciarFull\(/.test(admJsLimpio),
          "el arranque de la full debe tener nombre para poder reutilizarse");
        /* Cuenta el CUERPO de `iniciarFull`, no `let modo = "full"` — esa
           cadena vive en `encadenar`, así que contarla no mediría lo que dice.
           Lo que no puede haber es un segundo arranque de la full. */
        assert.strictEqual((admJsLimpio.match(/bitacora\("▶ iniciando carga completa"\)/g) || []).length, 1,
          "hay más de un arranque de la full: la invariante «1.ª full, siguientes auto» tendría dos copias");
        assert.strictEqual((admJsLimpio.match(/let modo = "full"/g) || []).length, 1,
          "el bucle de encadenado tiene que arrancar en `full` una sola vez");
        assert.ok(/sincronizacionFull[\s\S]{0,400}iniciarFull\(\)/.test(admJsLimpio),
          "el paso 3 debe REUTILIZAR iniciarFull, no repetir su cuerpo");
        assert.ok(/auditarCoberturaGenesis[\s\S]{0,900}ejecutarAuditoria\(\)/.test(admJsLimpio),
          "el paso 2 debe REUTILIZAR ejecutarAuditoria, no reimplementar la auditoría");
        /* Y TIENE QUE PROPAGAR SU RESULTADO. `ejecutarAuditoria` sale por
           cuatro caminos de fallo (sin token, red, 401, error del servidor); si
           el paso 2 devolviera `true` a secas, la cadena cantaría «✔ 2/3» sobre
           una auditoría que no corrió y lanzaría la full igual. Pasó: lo
           encontró la revisión adversaria y las cinco lentes coincidieron. */
        assert.ok(/return false/.test(admJsLimpio.slice(admJsLimpio.indexOf("async function ejecutarAuditoria"))),
          "ejecutarAuditoria tiene que poder decir que FALLÓ, o quien la encadena no puede saberlo");
        {
          const i = admJsLimpio.indexOf("async function auditarCoberturaGenesis");
          const cuerpo = admJsLimpio.slice(i, admJsLimpio.indexOf("\n  }", i));
          assert.ok(/const ok = await ejecutarAuditoria\(\)/.test(cuerpo) && /return ok;/.test(cuerpo),
            "el paso 2 debe devolver lo que DE VERDAD pasó, no un `true` incondicional");
          assert.ok(!/\breturn true;/.test(cuerpo),
            "un `return true` incondicional en el paso 2 hace que la cadena nunca pueda detenerse ahí");
          /* Fijar `.value` no dispara `change`: sin invalidar, la auditoría de
             OTRO perfil se queda pintada bajo el selector de Génesis. */
          assert.ok(/invalidarCoberturaPintada\(/.test(cuerpo),
            "cambiar el perfil desde código no dispara `change`: hay que invalidar lo pintado a mano");
          assert.ok(!/guardarPerfil\(/.test(cuerpo),
            "el paso 2 no puede persistir el perfil: esa clave la comparte el DASHBOARD, que es otra pantalla");
          /* La guarda de «auditoría en vuelo» tiene que estar ANTES de tocar el
             selector: si no, cuando responda la que estaba corriendo (otro
             perfil), sus cifras quedan pintadas bajo el rótulo «Génesis». */
          const iGuarda = cuerpo.indexOf("coberturaCargando");
          const iSelector = cuerpo.indexOf('$("c-perfil").value');
          assert.ok(iGuarda > 0 && iSelector > 0 && iGuarda < iSelector,
            "la guarda de «ya hay una auditoría en curso» va ANTES de mover el selector, "
            + "o las cifras de otro perfil acaban rotuladas como Génesis");
        }
        assert.ok(/auditarCoberturaGenesis[\s\S]{0,900}"genesis"/.test(admJsLimpio),
          "el paso 2 tiene que fijar el perfil en genesis: la auditoría de otro perfil sería la peor forma de equivocarse");

        /* La cadena PARA en el primer paso que falle: encadenar una auditoría
           sobre una carga que no ocurrió da un resultado creíble y equivocado. */
        assert.ok(/if \(!\(await cargarExperienciaDelRepositorio\(\)\)\)/.test(admJsLimpio),
          "la cadena debe detenerse si la carga falla");
        assert.ok(/if \(!\(await auditarCoberturaGenesis\(\)\)\)/.test(admJsLimpio),
          "la cadena debe detenerse si la auditoría falla");

        /* Ninguna pulsación sin respuesta visible (la lección del modal) y el
           avance en la bitácora, que es lo que pidió el encargo. `exigirToken`
           murió con el formulario: con el token integrado no hay nada que exigir. */
        assert.ok(!/exigirToken/.test(admJsLimpio),
          "exigirToken volvió: el token va integrado y ningún botón puede pedirlo");
        for (const paso of ["1/3", "2/3", "3/3"]) {
          assert.ok(admJsLimpio.includes(paso), `la bitácora no narra el paso ${paso}`);
        }
        /* Un `|| 0` sobre un conteo convierte «no sé» en «cero» y lo hace
           creíble: es el defecto de «en 0 procesos», y aquí serían contratos. */
        assert.ok(!/cuerpo\.(contratos_cargados|terminos_extraidos)\s*\|\|\s*0/.test(admJsLimpio),
          "un `|| 0` sobre los conteos de la carga convierte un «no sé» del servidor en un cero creíble");
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

      /* ---- panel: catálogo de precios APU ---- */
      for (const debe of ['id="seccion-apu"', 'id="btn-apu-cargar"', 'id="apu-mensaje"', 'id="apu-insumos"',
        'id="apu-items"', 'id="apu-regiones"', 'id="apu-base"', 'id="apu-icociv"', 'id="apu-spin"',
        'id="apu-detalle"', 'id="apu-regiones-tabla"', 'id="apu-meta"']) {
        assert.ok(admHtml.includes(debe), `admin.html sin ${debe} (falta la sección del catálogo APU)`);
      }
      assert.ok(/Cargar catálogo APU/.test(admHtml), "el botón debe decir «Cargar catálogo APU»");
      for (const debe of ["/api/apu/catalogo", "/api/admin/apu/cargar-catalogo", "cargarCatalogoApu",
        "cargarEstadoApu", "x-historico-token"]) {
        assert.ok(admJs.includes(debe), `app.js sin ${debe} (el catálogo APU no está cableado)`);
      }
      // doble clic: mismo blindaje que el RUP y la experiencia
      assert.ok(/\$\("btn-apu-cargar"\)\.disabled = true/.test(admJs),
        "«Cargar catálogo APU» debe deshabilitarse durante el envío");
      // el token va por cabecera, nunca en la URL
      assert.ok(!/\/api\/admin\/apu\/cargar-catalogo\?[^`"']*token=/.test(admJs),
        "el token de la carga del catálogo va por cabecera, nunca en la URL");
      /* CONSULTAR el catálogo es público y son dos comandos → sí se dispara al
         arrancar. CARGARLO escribe ~70 claves → jamás solo. */
      {
        const i = admJs.indexOf("function arrancarPaneles()");
        const cuerpo = admJs.slice(i, admJs.indexOf("\n  }", i));
        assert.ok(i > 0 && /cargarEstadoApu\(\)/.test(cuerpo),
          "el arranque debe consultar el estado del catálogo APU (es público y barato)");
        assert.ok(!/cargarCatalogoApu\(\)/.test(cuerpo),
          "cargar el catálogo escribe ~70 claves: no puede dispararse solo al abrir el panel");
      }
      // los conteos del catálogo tampoco pueden convertir «no sé» en «cero»
      assert.ok(!/\bt\.(insumos|items|regiones)\s*\|\|\s*0/.test(sinComentarios(admJs)),
        "admin.js: un conteo del catálogo leído con «|| 0» convierte un campo ausente en un cero creíble");

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
      /* …Y LA DIRECCIÓN CONTRARIA, que es la que faltaba (ago 2026, defecto real).
         La comprobación de arriba solo recorre `vercel.json`, así que un archivo
         NUEVO bajo `api/` podía desplegarse sin entrada: sin `includeFiles` no le
         viaja `data/**` y sin `maxDuration` se queda con el tope por defecto de la
         plataforma. Le pasó a `api/indice-baja.js`, que acepta
         `?reconstruir=true&presupuesto=60000` y habría muerto mucho antes de
         terminar — un fallo que no falla en local y que nadie ve hasta producción. */
      {
        const bajoApi = [];
        const recorrer = (rel) => {
          for (const e of fs.readdirSync(path.join(__dirname, "..", rel), { withFileTypes: true })) {
            if (e.isDirectory()) recorrer(`${rel}/${e.name}`);
            else if (e.name.endsWith(".js")) bajoApi.push(`${rel}/${e.name}`);
          }
        };
        recorrer("api");
        for (const fn of bajoApi) {
          assert.ok(vercel.functions[fn],
            `${fn} es una función serverless y no está declarada en vercel.json: se desplegaría sin data/** y con el maxDuration por defecto`);
        }
      }
      /* El catálogo de ítems APU es la otra semilla que viaja en `data/**`, y le
         toca la misma vigilancia: si dejara de empaquetarse, /api/apu/extraer-texto
         no podría mapear nada y el fallo saldría en producción, no aquí. */
      const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "catalogo_apu.json"), "utf8"));
      assert.ok(Array.isArray(catalogo.items) && catalogo.items.length >= 60, "catálogo de ítems APU vacío o incompleto");
      assert.ok(/semilla curada a mano/i.test(catalogo._meta.origen),
        "el catálogo debe declarar que es una semilla curada, no una estadística");
      assert.ok(/nunca inventar un c[oó]digo INV/i.test(catalogo._meta.por_que_ningun_codigo_INV),
        "el catálogo debe dejar escrito por qué ningún código es «INV-»");
      assert.ok(catalogo.items.every((i) => /^LOC-/.test(i.codigo_item)),
        "ningún código del catálogo puede publicarse como «INV-» sin haber abierto la especificación oficial");

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
