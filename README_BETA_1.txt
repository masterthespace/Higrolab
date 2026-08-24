HIDROLAB — BETA 1 CORREGIDA

IMPORTANTE
La Beta 1 anterior tenía un error de empaquetado: una sustitución de texto cambió
accidentalmente referencias técnicas como:
- hidrolab-ui-demo.css -> hidrolab-ui-BETA 1.css
- demo-app -> BETA 1-app

Eso hacía que el frontend perdiera su hoja de estilos y fallara visualmente.

ESTA VERSIÓN CORRIGE
- index.html enlaza correctamente hidrolab-ui-demo.css.
- calculadoras.html enlaza correctamente hidrolab-ui-demo.css.
- se restaura la clase interna demo-app (es solo un nombre técnico CSS, no se muestra al usuario).
- se eliminan archivos de entrada duplicados/backups que podían confundir el despliegue.
- se mantiene visible BETA 1 en la interfaz.
- se añade pie legal solicitado en las páginas.

PIE
© 2026 HIDROLAB · Derechos reservados a Gonzalo Campos V.
Constructor Civil · Evaluador CEV
gonzaloacv@gmail.com

PUNTO DE ENTRADA
index.html
