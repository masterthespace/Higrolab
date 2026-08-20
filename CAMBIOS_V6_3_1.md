# HIDROLAB V6.3.1 — Corrección Solar Studio

Corrección de arranque del módulo Simulador Solar Avanzado.

## Problema encontrado
La V6.3 utilizaba un `importmap` inline para resolver Three.js. La política CSP de producción bloqueaba scripts inline, por lo que el módulo JavaScript principal no llegaba a ejecutarse. Como consecuencia:
- no se poblaba Región;
- no se poblaba Comuna;
- no funcionaba la carga de imagen;
- no se inicializaba el editor CAD ni el visor 3D.

## Corrección
- Eliminado el `importmap` inline.
- Three.js y OrbitControls se importan ahora mediante URLs explícitas permitidas por la CSP.
- Se mantiene `comunas-chile.js` como recurso local.
- No se modifica la lógica de cálculo solar ni la geometría de planta.

Esta versión sustituye completamente a V6.3.
