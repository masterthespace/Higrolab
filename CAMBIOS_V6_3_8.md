# HIDROLAB V6.3.8 — Escala real + persona de referencia

## Problema corregido
Cuando la planta no estaba calibrada, el editor usaba una escala fija de respaldo
que podía convertir un dibujo grande en una huella de apenas 1–2 m. Al combinarla
con una altura real de 2,0 m, el edificio se veía como una torre.

## Cambios
- Se distingue claramente entre `ESCALA CALIBRADA` y `ESCALA APROXIMADA`.
- Si no hay calibración, el visor usa solo para previsualización una huella nominal
  cuya dimensión mayor es 8 m. No se presenta como medida real.
- Cuando existe calibración con una distancia conocida, el modelo utiliza esa escala real.
- Se incorpora una persona de referencia tridimensional de 1,70 m.
- Se incorpora una regla vertical junto al edificio, con marcas cada 1 m.
- El HUD muestra altura y dimensiones reales/estimadas de la planta.
- Los visores 3D y Solar muestran una advertencia visible cuando la planta no está calibrada.
- La persona y la regla también aparecen como referencia visual en el análisis solar.

Para análisis dimensional válido, se recomienda calibrar la planta con una medida real antes de interpretar proporciones.
