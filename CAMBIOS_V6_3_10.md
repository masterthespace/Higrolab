# HIDROLAB V6.3.10 — Orientación PDF corregida

## Error corregido
El esquema de identificación de fachadas del PDF dibujaba la planta en coordenadas
locales, mientras que las etiquetas de orientación y azimut correspondían al modelo
ya rotado geográficamente. Esto podía hacer que una fachada indicada como Sur
apareciera visualmente hacia el Norte de la flecha roja.

## Corrección
- El esquema PDF aplica ahora exactamente `Norte del proyecto + azimut adicional`.
- Se usa la misma transformación geométrica que el modelo WebGL.
- La flecha roja queda fija como Norte geográfico.
- F1, F2, F3… se colocan sobre la planta ya rotada.
- C1 se posiciona en el centroide de la planta rotada.
- Se agrega una nota en el esquema indicando que la planta coincide con el modelo 3D.

Resultado: la posición gráfica de cada fachada coincide con su azimut y orientación.
