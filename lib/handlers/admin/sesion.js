/* ============================================================================
   /api/admin?op=sesion|entrar|salir|crear-cuenta · LA ENTRADA DEL DUEÑO CON CORREO Y CONTRASEÑA (17-oct-2026)
   ----------------------------------------------------------------------------
   Plegadas como `op` del router de admin, jamás como archivo bajo api/ (la
   suite fija ese directorio en seis funciones). La lógica vive en lib/sesion;
   aquí solo se lee el cuerpo, se mira el método y el origen, y se pone o se
   quita la cookie.

     GET  op=sesion        ¿hay sesión? ¿existe ya la cuenta? Siempre 200 (con
                           Redis vivo): la página lo pregunta al arrancar y un
                           401 aquí sería un error en la consola de cada visita.
     POST op=entrar        {correo, contrasena} → cookie de 30 días. Correo
                           inexistente y contraseña mala responden lo MISMO.
     POST op=salir         borra la sesión EN EL SERVIDOR y la cookie.
     POST op=crear-cuenta  {llave, correo, contrasena}: solo mientras no exista
                           ninguna cuenta y con la llave del servidor
                           (HISTORICO_TOKEN) escrita a mano. Después, 409.

   Los tres POST exigen que la petición venga de la propia página (Origin igual
   al host): además de SameSite=Strict, un sitio ajeno no puede ni hacer entrar
   al navegador del dueño en otra cuenta ni sacarlo de la suya.
   ========================================================================== */
"use strict";

const Sesion = require("../../sesion.js");
const { hayCredenciales, crearRedis } = require("../../redis.js");
const { leerCuerpo } = require("../../cuerpo.js");

const MAX_BYTES = 8 * 1024;   // un correo y dos contraseñas; nada más grande tiene motivo

module.exports = async function sesion(req, res, { op = "sesion" } = {}) {
  res.setHeader("Cache-Control", "no-store");
  const metodo = String(req.method || "GET").toUpperCase();
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue: sin la base de datos no se puede entrar." });
  }
  const redis = crearRedis({});

  if (op === "sesion") {
    if (metodo !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ ok: false, error: "«sesion» se consulta por GET." }); }
    try {
      const [s, existe] = await Promise.all([Sesion.sesionDeLaPeticion(req, { redis }), Sesion.hayCuenta(redis)]);
      if (s.presente && !s.ok && s.status === 503) return res.status(503).json({ ok: false, error: s.error });
      /* una cookie que ya no vale se retira aquí: la próxima petición del
         navegador no la vuelve a mandar como «credencial presente» */
      if (s.presente && !s.ok) res.setHeader("Set-Cookie", Sesion.cabeceraBorrarCookie());
      return res.status(200).json({ ok: true, sesion: s.ok === true, hay_cuenta: existe });
    } catch {
      return res.status(503).json({ ok: false, error: Sesion.MSG_ALMACEN });
    }
  }

  if (metodo !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: `«${op}» se envía por POST desde la pantalla de la aplicación.` });
  }
  if (!Sesion.peticionDelMismoSitio(req)) return res.status(403).json({ ok: false, error: Sesion.MSG_ORIGEN, motivo: "origen" });

  if (op === "salir") {
    try { await Sesion.cerrarSesion(redis, req); } catch {
      return res.status(503).json({ ok: false, error: "No se pudo cerrar la sesión porque la base de datos no respondió. Vuelva a intentarlo." });
    }
    res.setHeader("Set-Cookie", Sesion.cabeceraBorrarCookie());
    return res.status(200).json({ ok: true, sesion: false });
  }

  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const d = cuerpo.datos && typeof cuerpo.datos === "object" ? cuerpo.datos : {};

  const r = op === "entrar"
    ? await Sesion.entrar(redis, req, { correo: d.correo, contrasena: d.contrasena })
    : await Sesion.crearCuentaDelDueno(redis, req, { llave: d.llave, correo: d.correo, contrasena: d.contrasena });
  if (r.token) res.setHeader("Set-Cookie", Sesion.cabeceraCookie(r.token));
  return res.status(r.status).json(r.cuerpo);
};
