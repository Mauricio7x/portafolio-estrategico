/* ============================================================================
   /api/sync/unlock · Desbloqueo de emergencia del candado de sincronización
   ----------------------------------------------------------------------------
   Borra el candado detecta:x:lock sin condiciones. Para el caso "la
   sincronización quedó bloqueada y no quiero esperar el TTL (≤5 min) ni el
   detector de candados muertos (10 min)". Protegido con CRON_SECRET:

     curl -H "Authorization: Bearer $CRON_SECRET" \
          "https://TU-APP.vercel.app/api/sync/unlock"
     (o en el navegador: /api/sync/unlock?secret=TU_CRON_SECRET)

   Responde habiaCandado para distinguir "he desbloqueado algo" de "no había
   nada" (si no había nada y aun así ves enCurso, el problema son las
   credenciales de Redis: el error 502 de /api/sync te dará la causa).
   ========================================================================== */

import { crearAlmacen, claves } from "../../lib/almacen.js";
import { hayCredenciales } from "../../lib/redis.js";

export default async function handler(req, res) {
  const s = process.env.CRON_SECRET;
  const autorizado = !!s && (req.headers["authorization"] === `Bearer ${s}` || req.query.secret === s);
  if (!autorizado) return res.status(401).json({ error: "no autorizado" });
  if (!hayCredenciales()) {
    return res.status(503).json({ error: "Falta Upstash Redis (UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN)" });
  }
  const store = crearAlmacen({});
  const K = claves("");
  try {
    const habia = await store.get(K.lock);
    await store.del(K.lock);
    return res.status(200).json({ ok: true, desbloqueado: true, habiaCandado: habia != null });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "Redis inaccesible: " + String(e && e.message || e) });
  }
}
