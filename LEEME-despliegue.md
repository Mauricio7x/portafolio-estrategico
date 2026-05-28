# Detecta · Despliegue en Vercel

## Estructura de archivos (respétala tal cual)

```
/  (raíz del proyecto)
├── index.html          ← app principal (marca Detecta + logo + proxy + auth)
├── modulo_apu.html     ← módulo APU con ajuste ICOCIV
├── logo.svg            ← logo independiente (por si lo necesitas suelto)
├── vercel.json         ← configuración y cabeceras de seguridad
└── api/
    ├── proxy.js        ← proxy propio con token Socrata
    └── auth.js         ← login del lado servidor
```

La carpeta `api/` es obligatoria con ese nombre: Vercel detecta ahí las
funciones serverless automáticamente.

## Variables de entorno (Vercel → Settings → Environment Variables)

Crea estas TRES variables (Production y Preview):

| Nombre              | Valor                                                        |
|---------------------|--------------------------------------------------------------|
| `SOCRATA_APP_TOKEN` | Tu token de datos.gov.co                                     |
| `APP_PASSWORD`      | La contraseña con la que entrarás a Detecta                  |
| `SESSION_SECRET`    | Una cadena aleatoria larga (48+ caracteres, lo que sea)      |

Sin estas variables el login y la carga de datos NO funcionan en producción.

## Después de configurar

1. Sube los archivos (o haz push al repo conectado a Vercel).
2. Vercel redesplegará solo.
3. Abre el sitio, ingresa la contraseña (APP_PASSWORD) y recarga procesos.

## Nota de seguridad

Regenera tu App Token en datos.gov.co y deja el nuevo SOLO en la variable
`SOCRATA_APP_TOKEN`. El token anterior quedó visible en el chat.
