# HIDROLAB — versión endurecida para producción

## Cambios de seguridad aplicados
- JavaScript inline extraído a archivos locales en `/assets`; CSP bloquea scripts inline y event handlers HTML.
- Content-Security-Policy restrictiva mediante `vercel.json`.
- `object-src 'none'`, `base-uri 'none'`, `form-action 'none'` y `frame-ancestors 'none'`.
- Recursos de red limitados al mismo origen; únicamente se permite `youtube-nocookie.com` como futuro origen de iframes.
- Cabeceras `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS y COOP.
- Entradas de nombres personalizados en Pérdidas térmicas y Costo de calefacción se codifican antes de insertarse en HTML.
- No hay credenciales, tokens, API keys, login, backend ni base de datos en esta versión.

## Regla para futuros videos de YouTube
Usar embeds de privacidad mejorada: `https://www.youtube-nocookie.com/embed/VIDEO_ID`. Si se incorpora otro proveedor externo, actualizar deliberadamente `frame-src`; no ampliar `default-src`.

## Importante
La lógica JavaScript de una aplicación estática siempre es visible al visitante. La seguridad no depende de ocultar fórmulas. Nunca agregar secretos, claves privadas ni tokens a HTML/JS público.
