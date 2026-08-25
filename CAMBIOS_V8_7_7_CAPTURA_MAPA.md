# HIDROLAB V8.7.7 — Captura directa de Google Maps

Base: V8.7.6 Header Premium.

## Solar Studio
Se agrega un método principal sin API key:

1. ajustar Google Maps;
2. pulsar "Capturar mapa visible";
3. seleccionar "Esta pestaña" en el diálogo del navegador;
4. HIDROLAB recorta automáticamente el rectángulo del iframe de Google Maps;
5. la captura se inserta como referencia visual debajo del canvas de PLANTA;
6. calibrar distancia y dibujar encima.

## Seguridad / navegador
- usa `navigator.mediaDevices.getDisplayMedia()`;
- requiere permiso explícito del usuario;
- requiere HTTPS en producción;
- se recomienda Chrome o Edge;
- HIDROLAB no obtiene acceso permanente a la pantalla;
- el MediaStream se detiene inmediatamente después de obtener el fotograma.

## Compatibilidad
Google Static Maps API se conserva como método alternativo avanzado, pero ya no es necesaria para el flujo principal.

## Funcionalidad preservada
No se modifican fórmulas, cálculo solar, geometría, PDF, navegación, Google Maps interactivo ni carga JPG/PNG.
