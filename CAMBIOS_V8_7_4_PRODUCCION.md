# HIDROLAB V8.7.4 — Landing producción

Corrección de carga en Vercel.

## Causa
El proyecto tiene una Content-Security-Policy estricta en `vercel.json`:
- `script-src` no permite `https://cdn.tailwindcss.com`
- `style-src` no permite Google Fonts externos
- `font-src` permite solo recursos locales

Por eso la versión Tailwind CDN podía publicar el HTML correcto pero no cargar su diseño.

## Corrección
- Se eliminó Tailwind CDN del frontend.
- Tailwind fue compilado a `landing-tailwind.css` y queda servido localmente.
- Se eliminaron las dependencias de Google Fonts; se mantienen Inter/Roboto Mono como primera opción con fallback seguro del sistema.
- No se modificó contenido, enlaces ni comportamiento del Solar Preview.
- `modern-ui.js` continúa ejecutando el canvas interactivo.

Esta versión respeta la CSP existente y es adecuada para GitHub + Vercel.
