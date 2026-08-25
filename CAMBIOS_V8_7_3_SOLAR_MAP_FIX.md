# HIDROLAB V8.7.3 — Google Maps en Solar Studio + Atrás corregido

- Se retira Google Maps de la portada.
- La sección Home "Análisis solar interactivo" vuelve a su formato simple.
- En Solar Studio / REFERENCIA SATELITAL se agregan dos modos:
  - JPG / PNG
  - Google Maps
- Google Maps usa la misma latitud/longitud del bloque Emplazamiento.
- Cambiar Región/Comuna actualiza las coordenadas y el mapa.
- Coordenadas manuales también pueden actualizar el mapa.
- Se mantiene la carga de imagen como referencia de fondo para el CAD.
- Se agrega enlace para abrir la misma ubicación en Google Maps.
- El botón Atrás deja de usar onclick inline.
- Se crea assets/navigation.js compatible con la CSP.
- Atrás vuelve al historial interno si existe; si no, vuelve a index.html.

No se modifican fórmulas ni lógica de cálculo solar.
