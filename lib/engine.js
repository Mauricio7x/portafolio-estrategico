/* ============================================================================
   Detecta · Motor de encaje compartido (Node + navegador)
   ----------------------------------------------------------------------------
   Portado 1:1 desde index.html para que el CRON del servidor calcule el MISMO
   puntaje que ve el usuario en la web. No dupliques la lógica: si cambias una
   regla aquí, el front y el cron quedan sincronizados.

   Exporta (CommonJS): calcScore, mapProcess, profiles, SECOP_SOURCES, util geo.
   ========================================================================== */

'use strict';

/* ---------- Constantes económicas ---------- */
const SMMLV = 1750905; // 2026; actualízalo cada enero

/* ---------- Whitelists UNSPSC (clases de 8 dígitos) ----------
   Pegadas desde tu index.html. Si renuevas el RUP, reemplaza estos arreglos. */
const UNSPSC_HELDER = ["11121600","11162100","20142900","22101500","23153100","23181700","24101900","24141500","26121500","26121600","26131500","30101500","30101700","30101800","30102000","30102200","30102300","30102400","30102900","30103200","30111500","30111600","30111900","30121600","30131500","30131600","30131700","30151500","30151800","30152000","30161500","30161600","30161700","30161800","30161900","30162100","30162200","30162300","30171500","30171600","30171800","30171900","30172100","30181500","30181600","30181700","30181800","30191500","30191700","30241600","30261700","31162100","31211500","39111500","39111800","39121000","39121100","39121300","39121400","39121500","39121600","39121700","39121900","39122000","39122200","40151500","41113700","43211700","43211800","43221500","43221700","43221800","43222500","43222600","43222800","43222900","43223300","43232600","48101500","56101500","56101700","56101900","56111500","56111700","56111900","56112000","56112100","56112200","70111700","70151800","70171800","71101600","71101700","71121400","71121600","71122000","71122400","71122600","71123000","71141100","71161400","72101500","72102900","72103300","72111000","72111100","72121000","72121100","72121200","72121300","72121400","72121500","72141000","72141100","72141300","72141400","72141500","72141700","72151000","72151100","72151200","72151300","72151400","72151500","72151600","72151700","72151900","72152000","72152100","72152200","72152300","72152400","72152500","72152600","72152700","72152800","72152900","72153000","72153100","72153200","72153300","72153400","72153500","72153600","72153700","72153900","72154000","72154100","72154300","76111500","76121700","77101500","77101600","77101700","77101800","77101900","77102000","77111600","77121700","80101500","80101600","80101700","80111600","80111700","81101500","81101700","81102200","81102400","81111600","81111700","81141500","81141800","81151700","81151800","81151900","83101500","84111700","91111500","93141700","95101500","95101600","95111500","95111600","95121600","95121700","95121800","95121900","95122000","95122100","95122300","95122500","95122700","95141700"];
const UNSPSC_GENESIS = ["11111500","12161800","22101500","22101600","22101700","22101800","22101900","22102000","23151600","23153400","24101600","24102000","25121600","26141800","27111500","27112200","30101500","30101700","30101800","30102000","30102200","30102300","30102400","30102800","30102900","30103100","30103200","30103600","30111500","30111600","30111700","30111800","30111900","30121500","30121600","30121700","30121800","30121900","30131500","30131600","30131700","30141500","30141600","30151500","30151600","30151700","30151800","30151900","30152000","30152100","30161500","30161600","30161700","30161800","30161900","30162000","30162100","30162200","30162300","30162400","30171500","30171600","30171700","30171800","30171900","30172000","30172100","30181500","30181600","30181700","30181800","30191500","30191600","30191700","30191800","30241500","30241600","30241700","30263800","30263900","30264900","30265000","30265100","30265200","30265300","30265400","30266300","31152200","31162100","32101500","32101600","39101600","39101800","39101900","39111500","39111600","39111800","39111900","39112300","39121000","39121100","39121300","39121400","39121700","39121900","39122100","39122200","39122300","39131700","40141600","40141700","40141900","40151500","40171500","40171600","40171700","40171800","40171900","40172000","40172100","40172200","40172300","40172400","40172500","40172600","40172700","40172800","40172900","40173000","40173100","40173200","40173300","40173400","40173500","40173600","40173700","40173800","40173900","40174000","40174100","40174200","40174300","40174400","40174500","40174600","40174700","40174800","40174900","40175000","40175100","40175200","40175300","40181500","40181600","40181700","40181800","40181900","40182000","40182100","40182200","40182300","40182400","40182500","40182600","40182700","40182800","40182900","40183000","40183100","42271900","46171500","49221500","49241700","49241800","52131500","52131600","52131700","52171000","53121700","53131600","53131700","56101500","56101600","56101700","56101900","56111500","56111600","56112100","56112200","56121000","56121100","56121300","56121500","56121700","60101300","70111500","70111700","70131500","70131600","70131700","70171500","70171800","71101600","71122500","71151100","71161400","71161500","71161600","72101500","72102900","72103300","72111000","72111100","72121000","72121100","72121200","72121300","72121400","72121500","72141000","72141100","72141200","72141300","72141400","72141500","72141600","72141700","72151000","72151100","72151200","72151300","72151400","72151500","72151600","72151700","72151800","72151900","72152000","72152100","72152200","72152300","72152400","72152500","72152600","72152700","72152800","72152900","72153000","72153100","72153200","72153300","72153400","72153500","72153600","72153700","72153900","72154000","72154300","72154400","72154500","73121600","76111500","76122000","77101500","77101600","77101700","77101800","77101900","77102000","77111500","77111600","77121600","77121700","78101800","78101900","78111800","78111900","78181600","80101500","80101600","80101700","80111500","80111600","80131800","80161500","81101500","81101600","81101700","81101800","81101900","81102000","81102100","81102200","81102300","81102400","81141500","81141800","82121600","83101500","83101600","83101800","84131600","85101500","85101600","85101700","85121700","86101600","86101700","86121500","86121600","90111700","91101500","91111500","91111600","93131800","93142000","95101500","95101600","95101700","95101800","95101900","95111500","95111600","95121500","95121600","95121700","95121800","95121900","95122000","95122100","95122300","95122400","95122500","95122600","95122700","95131500","95131600","95131700","95141500","95141600","95141700","95141800","95141900"];
const UNSPSC_JUNTOS = Array.from(new Set([...UNSPSC_HELDER, ...UNSPSC_GENESIS]));

/* ---------- Perfiles (espejo del front; valores K conservadores) ---------- */
const profiles = {
  helder: {
    // Fuente única: RUP HGRS, corte 31/12/2025 (en firme), exp. 07/05/2026.
    name: "Helder Gustavo Rodríguez Santana",
    liquidez: 129.12, endeud: 0.04, cobertura: 662.70,
    patrimonio: 1107252964,
    utilidadOp: 198810000,        // utilidad operacional RUP 2025 (antes $5.688.000)
    co: 198810000,                // CO = ingreso/utilidad operacional del RUP
    expSMMLV: 6768.87,            // mayor contrato acreditado (Consorcio Infraestr. Boyacá)
    profesionales: 1, topeSMMLV: 4000,
    unspscClases: UNSPSC_HELDER,
  },
  genesis: {
    name: "Génesis Ingeniería y Construcción GIC SAS",
    liquidez: 6.98, endeud: 0.13, cobertura: 168.81,
    co: 150244977,
    expSMMLV: 31593.88, profesionales: 3, topeSMMLV: 2000,
    unspscClases: UNSPSC_GENESIS,
  },
  juntos: {
    name: "Helder + Génesis · Consorcio / Unión Temporal",
    liquidez: 6.98, endeud: 0.13, cobertura: 168.81,
    co: 349054977,
    expSMMLV: 38362.75, profesionales: 4, topeSMMLV: 11000,
    unspscClases: UNSPSC_JUNTOS,
  },
};

/* ---------- Capacidad Residual (CCE-EICP-GI-22) ---------- */
function factorE(expSMMLV, presupuestoSMMLV) {
  if (presupuestoSMMLV <= 0) return 60;
  const r = expSMMLV / presupuestoSMMLV;
  if (r > 3) return 120; if (r > 2) return 100; if (r > 1) return 80; return 60;
}
function factorCT(prof) { if (prof >= 7) return 40; if (prof >= 4) return 30; return 20; }
function factorCF(liq) { if (liq >= 1.5) return 40; if (liq >= 1.2) return 30; if (liq >= 1.0) return 20; return 0; }

function calcK(profile, presupuestoSMMLV) {
  const E = factorE(profile.expSMMLV, presupuestoSMMLV);
  const CT = factorCT(profile.profesionales);
  const CF = factorCF(profile.liquidez);
  const crp = profile.co * (E + CT + CF) / 100; // SCE=0 en server (conservador)
  return { crp, E, CT, CF };
}
function calcCRPC(presupuesto, anticipoPct, plazoMeses) {
  const anticipo = presupuesto * (anticipoPct || 0) / 100;
  const base = presupuesto - anticipo;
  const meses = Math.max(1, plazoMeses || 12);
  return meses <= 12 ? base : base * 12 / meses;
}

/* ---------- Texto / semántica ---------- */
function normalizaTexto(s) {
  return (s || "").toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim();
}
const OBRA_TERMS = /(construcci|pavimenta|alcantarill|acueducto|placa\s*huella|v[ií]as?|interventor[ií]a\s+de\s+obra|estudios\s+y\s+dise|edificaci|redes?\s+(hidr[áa]ulic|el[ée]ctric|sanitari)|mantenimiento\s+vial|puente|box\s*coulvert|obra\s+civil|adecuaci[óo]n|mejoramiento\s+de\s+v[ií]a|optimizaci[óo]n\s+de)/i;
const NO_OBRA = /(canin|antinarc|alimentaci[óo]n\s+escolar|dotaci[óo]n|refrigeri|combustible|vigilancia|aseo\b|cafeter[ií]a|p[óo]liza)/i;
function clasificaSemanticamente(p) {
  const t = normalizaTexto((p.nombre || "") + " " + (p.descripcion || ""));
  if (NO_OBRA.test(t)) return "no-obra";
  if (OBRA_TERMS.test(t)) return "obra";
  return "indeterminado";
}
function unspscClase(s) {
  const d = (s || "").toString().replace(/\D/g, "");
  if (d.length >= 8) return d.slice(0, 8);
  return "";
}

/* ---------- Geografía (radio operativo real) ---------- */
const BASES = { bogota: { lat: 4.7110, lng: -74.0721 }, ibague: { lat: 4.4389, lng: -75.2322 } };
const HUBS_AIRE = {
  cucuta: { lat: 7.9275, lng: -72.5115 }, cali: { lat: 3.5430, lng: -76.3816 },
  medellin: { lat: 6.1645, lng: -75.4231 }, bucaramanga: { lat: 7.1265, lng: -73.1848 },
  pasto: { lat: 1.3964, lng: -77.2915 }, yopal: { lat: 5.3192, lng: -72.3840 },
  florencia: { lat: 1.5894, lng: -75.5644 }, neiva: { lat: 2.9500, lng: -75.2940 },
  monteria: { lat: 8.8235, lng: -75.8258 }, santamarta: { lat: 11.1196, lng: -74.2306 },
  barranquilla: { lat: 10.8896, lng: -74.7808 },
};
const SINUOSIDAD = 1.35;
const RADIO_RECTO_MAX = 200 / SINUOSIDAD;
const RADIO_POST_VUELO_RECTO = 120 / SINUOSIDAD;
function haversineKm(a, b) {
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const COORDS_MUNICIPIOS = {
  "distrito capital|bogota": { lat: 4.7110, lng: -74.0721 }, "cundinamarca|soacha": { lat: 4.5790, lng: -74.2169 },
  "cundinamarca|chia": { lat: 4.8614, lng: -74.0327 }, "cundinamarca|zipaquira": { lat: 5.0221, lng: -73.9947 },
  "cundinamarca|facatativa": { lat: 4.8141, lng: -74.3553 }, "cundinamarca|fusagasuga": { lat: 4.3372, lng: -74.3637 },
  "cundinamarca|girardot": { lat: 4.3045, lng: -74.8016 }, "tolima|ibague": { lat: 4.4389, lng: -75.2322 },
  "tolima|espinal": { lat: 4.1531, lng: -74.8847 }, "tolima|melgar": { lat: 4.2044, lng: -74.6428 },
  "tolima|honda": { lat: 5.1939, lng: -74.7411 }, "tolima|lerida": { lat: 4.8625, lng: -74.9089 },
  "tolima|chaparral": { lat: 3.7239, lng: -75.4836 }, "tolima|natagaima": { lat: 3.6228, lng: -75.0925 },
  "boyaca|tunja": { lat: 5.5353, lng: -73.3678 }, "boyaca|duitama": { lat: 5.8245, lng: -73.0342 },
  "boyaca|sogamoso": { lat: 5.7144, lng: -72.9339 }, "boyaca|chiquinquira": { lat: 5.6175, lng: -73.8181 },
  "quindio|armenia": { lat: 4.5339, lng: -75.6811 }, "risaralda|pereira": { lat: 4.8133, lng: -75.6961 },
  "caldas|manizales": { lat: 5.0689, lng: -75.5174 }, "huila|neiva": { lat: 2.9273, lng: -75.2819 },
  "huila|garzon": { lat: 2.1969, lng: -75.6275 }, "meta|villavicencio": { lat: 4.1420, lng: -73.6266 },
  "meta|acacias": { lat: 3.9886, lng: -73.7589 }, "meta|granada": { lat: 3.5469, lng: -73.7064 },
  "norte de santander|cucuta": { lat: 7.8939, lng: -72.5078 }, "valle del cauca|cali": { lat: 3.4516, lng: -76.5320 },
  "antioquia|medellin": { lat: 6.2442, lng: -75.5812 }, "santander|bucaramanga": { lat: 7.1193, lng: -73.1227 },
  "narino|pasto": { lat: 1.2136, lng: -77.2811 }, "casanare|yopal": { lat: 5.3378, lng: -72.3959 },
  "caqueta|florencia": { lat: 1.6144, lng: -75.6062 },
};
const ACCESO_DIFICIL = new Set([
  "tolima|planadas", "tolima|rioblanco", "tolima|ataco", "tolima|dolores",
  "huila|la plata", "huila|san agustin", "boyaca|cubara", "boyaca|el cocuy",
  "cundinamarca|yacopi", "cundinamarca|la palma", "cundinamarca|caparrapi",
  "caldas|pensilvania", "caldas|aguadas",
]);
function resolverCoords(ciudad, depto) {
  const c = normalizaTexto(ciudad), d = normalizaTexto(depto);
  if (!c && !d) return null;
  const key = d + "|" + c;
  if (COORDS_MUNICIPIOS[key]) return COORDS_MUNICIPIOS[key];
  for (const k in COORDS_MUNICIPIOS) if (k.endsWith("|" + c) && c) return COORDS_MUNICIPIOS[k];
  for (const k in COORDS_MUNICIPIOS) if (k.startsWith(d + "|") && d) return COORDS_MUNICIPIOS[k];
  return null;
}
function enRadioOperativo(ciudad, depto) {
  const _k = normalizaTexto(depto) + "|" + normalizaTexto(ciudad);
  if (ACCESO_DIFICIL.has(_k)) return "remoto";
  const pt = resolverCoords(ciudad, depto);
  if (!pt) return "fuera";
  if (Math.min(haversineKm(pt, BASES.bogota), haversineKm(pt, BASES.ibague)) <= RADIO_RECTO_MAX) return "terrestre";
  for (const h in HUBS_AIRE) if (haversineKm(pt, HUBS_AIRE[h]) <= RADIO_POST_VUELO_RECTO) return "aire";
  return "remoto";
}

/* ---------- Puntaje de encaje 0..100 (idéntico al front) ---------- */
function calcScore(p, profile) {
  const reasons = [];
  let score = 0;
  const clase = p._clase || unspscClase(p.unspsc);
  const sem = clasificaSemanticamente(p);

  if (clase && profile.unspscClases.includes(clase)) {
    score += 20; reasons.push({ k: "+20", t: "Clase UNSPSC " + clase + " presente en el RUP" });
  } else if (clase) {
    reasons.push({ k: "+0", t: "Clase UNSPSC " + clase + " NO está en el RUP — fuera del alcance" });
  } else if (sem === "obra") {
    score += 10; reasons.push({ k: "+10", t: "SECOP no declaró UNSPSC, pero el objeto coincide con obra civil — verificar en pliego" });
  } else {
    reasons.push({ k: "+0", t: "UNSPSC no declarado y el objeto no coincide con obra civil" });
  }

  const presupuestoSMMLV = (p.valor || 0) / SMMLV;
  if (p.valor === 0) { score += 4; reasons.push({ k: "+4", t: "Sin presupuesto declarado en SECOP (verificar en pliego)" }); }
  else if (presupuestoSMMLV <= profile.topeSMMLV) { score += 15; reasons.push({ k: "+15", t: "Cuantía dentro del tope (" + presupuestoSMMLV.toFixed(0) + " SMMLV)" }); }
  else { reasons.push({ k: "+0", t: "Cuantía supera el tope (" + presupuestoSMMLV.toFixed(0) + " SMMLV)" }); }

  const k = calcK(profile, presupuestoSMMLV);
  const crpc = calcCRPC(p.valor || 0, 0, p.plazoMeses || 12);
  if (p.valor === 0) { score += 8; reasons.push({ k: "+8", t: "K no evaluable sin presupuesto" }); }
  else if (k.crp >= crpc) { score += 35; reasons.push({ k: "+35", t: "K residual suficiente" }); }
  else { reasons.push({ k: "+0", t: "K residual insuficiente" }); }

  const fase = (p.fase || "").toLowerCase();
  if (/selecci/i.test(fase) && !/precal/i.test(fase)) { score += 10; reasons.push({ k: "+10", t: "Fase Selección — oportunidad activa" }); }
  else if (/borrador|planea|precal/i.test(fase)) { score += 7; reasons.push({ k: "+7", t: "Fase temprana — vigilar" }); }
  else if (/adjudica|celebra|ejecut/i.test(fase)) { reasons.push({ k: "+0", t: "Fase tardía/cerrada" }); }
  else { score += 5; reasons.push({ k: "+5", t: "Fase no clasificada" }); }

  if (profile.liquidez >= 1.5 && profile.endeud <= 0.7) { score += 10; reasons.push({ k: "+10", t: "Indicadores financieros holgados" }); }
  else { reasons.push({ k: "+0", t: "Indicadores financieros ajustados" }); }

  const ubic = enRadioOperativo(p.ciudad, p.depto);
  if (ubic === "terrestre") { score += 10; reasons.push({ k: "+10", t: "Dentro del radio operativo terrestre (≤200 km)" }); }
  else if (ubic === "aire") { score += 8; reasons.push({ k: "+8", t: "Accesible por aire (vuelo ≤2h45m + ≤2h terrestres)" }); }
  else if (ubic === "remoto") { reasons.push({ k: "+0", t: "Municipio remoto — fuera de rango logístico" }); }
  else { reasons.push({ k: "+0", t: "Fuera del radio operativo o sin ubicación" }); }

  return { score, reasons, k, crpc, ubic };
}

/* ---------- "¿Qué falta para 100%?" ---------- */
/* Convierte las razones con "+0" en acciones concretas. Esto es lo que el
   usuario pidió: no solo el puntaje, sino el camino para subirlo. */
function faltaPara100(scoreResult) {
  const gaps = [];
  for (const r of scoreResult.reasons) {
    if (r.k === "+0") {
      if (/UNSPSC/.test(r.t)) gaps.push("La clase del objeto no está en el RUP. Si es obra real, evalúa el perfil Consorcio (cubre más clases) o verifica el código en el pliego.");
      else if (/Cuantía supera/.test(r.t)) gaps.push("El presupuesto excede tu tope estratégico. Considera presentarte en consorcio para repartir el riesgo.");
      else if (/K residual/.test(r.t)) gaps.push("Tu K disponible no cubre el K exigido. Un anticipo ≥20% reduce el K exigido; verifícalo en el pliego, o ve en consorcio.");
      else if (/Fase tardía/.test(r.t)) gaps.push("El proceso ya está adjudicado o en ejecución; no hay ventana para ofertar.");
      else if (/remoto|Fuera del radio/.test(r.t)) gaps.push("La ejecución cae fuera de tu radio logístico (Bogotá/Ibagué). Subiría el costo de movilización.");
      else if (/Indicadores/.test(r.t)) gaps.push("Revisa liquidez/endeudamiento del perfil contra el pliego.");
    } else if (r.k === "+7" || r.k === "+5" || r.k === "+8" || r.k === "+4") {
      // factores parciales: nota suave
      if (/Fase temprana/.test(r.t)) gaps.push("Está en fase temprana (borrador/planeación): aún no abre, pero conviene vigilarlo.");
      else if (/Accesible por aire/.test(r.t)) gaps.push("Llega por aire, no por tierra: suma costo de viaje aéreo a la rentabilidad.");
      else if (/Sin presupuesto/.test(r.t)) gaps.push("SECOP no declaró presupuesto: ábrelo para confirmar cuantía y viabilidad real.");
    }
  }
  return gaps;
}

/* ---------- Fuentes Socrata oficiales ---------- */
const SECOP_SOURCES = {
  // SECOP II procesos (el que ya usabas)
  secop2: {
    base: "https://www.datos.gov.co/resource/p6dx-8zbt.json",
    f: {
      fecha: "fecha_de_publicacion_del", valor: "precio_base", nombre: "nombre_del_procedimiento",
      descripcion: "descripci_n_del_procedimiento", entidad: "entidad", modalidad: "modalidad_de_contratacion",
      fase: "fase", estado: "estado_del_procedimiento", ciudad: "ciudad_entidad", depto: "departamento_entidad",
      duracion: "duracion", unidadDur: "unidad_de_duracion", url: "urlproceso", id: "id_del_proceso",
      referencia: "referencia_del_proceso", unspsc: "codigo_principal_de_categoria", tipoContrato: "tipo_de_contrato",
    },
    label: "SECOP II",
  },
  // SECOP I procesos (NUEVO — dataset oficial verificado: j2gf-dg7m)
  secop1: {
    base: "https://www.datos.gov.co/resource/j2gf-dg7m.json",
    f: {
      fecha: "fecha_de_cargue_en_el_secop", valor: "cuantia_proceso", nombre: "detalle_del_objeto_a_contratar",
      descripcion: "detalle_del_objeto_a_contratar", entidad: "nombre_de_la_entidad", modalidad: "tipo_de_proceso",
      fase: "estado_del_proceso", estado: "estado_del_proceso", ciudad: "municipio_entidad", depto: "departamento_entidad",
      duracion: "", unidadDur: "", url: "ruta_proceso_en_secop_i", id: "numero_de_proceso",
      referencia: "numero_de_proceso", unspsc: "id_objeto_a_contratar", tipoContrato: "tipo_de_contrato",
    },
    label: "SECOP I",
  },
};

/* ---------- mapProcess genérico (acepta el esquema de cualquier fuente) ---------- */
function mapProcess(row, source) {
  const F = source.f;
  const rawUrl = row[F.url];
  const url = (rawUrl && typeof rawUrl === "object") ? (rawUrl.url || "") : (rawUrl || "");
  let plazoMeses = 12;
  if (F.duracion && row[F.duracion]) {
    const d = parseInt(row[F.duracion]) || 12;
    plazoMeses = /d[ií]a/i.test(row[F.unidadDur] || "") ? Math.max(1, Math.round(d / 30)) : d;
  }
  return {
    fuente: source.label,
    id: row[F.id] || (row[F.nombre] || "").slice(0, 30),
    referencia: row[F.referencia] || "",
    nombre: row[F.nombre] || "Sin nombre",
    descripcion: row[F.descripcion] || "",
    entidad: row[F.entidad] || "—",
    modalidad: row[F.modalidad] || "—",
    fase: row[F.fase] || "—",
    estado: row[F.estado] || "—",
    ciudad: row[F.ciudad] || "",
    depto: row[F.depto] || "",
    fecha: row[F.fecha] || "",
    valor: parseFloat(row[F.valor]) || 0,
    plazoMeses,
    url,
    unspsc: row[F.unspsc] || "",
    tipoContrato: row[F.tipoContrato] || "",
  };
}

module.exports = {
  SMMLV, profiles, SECOP_SOURCES,
  calcScore, mapProcess, faltaPara100,
  calcK, calcCRPC, unspscClase, clasificaSemanticamente,
  enRadioOperativo, normalizaTexto,
};
