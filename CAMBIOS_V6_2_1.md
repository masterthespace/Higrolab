# HIDROLAB V6.2.1 — Editor de planta calibrado

Correcciones del Simulador Solar Avanzado:

- El editor de planta ocupa ahora todo el ancho disponible y hasta 76% de la altura de la ventana.
- La captura satelital conserva su relación de aspecto original; ya no se estira a 900×520.
- Los clics se transforman mediante la matriz SVG real (`getScreenCTM`), por lo que vértices, Norte y puntos de calibración coinciden con la posición visible aunque el navegador redimensione el editor.
- La calibración se realiza con píxeles de la imagen original y mantiene visible la línea de referencia después de aplicar la distancia.
- Se muestra la distancia calibrada y, al cerrar una planta calibrada, dimensiones aproximadas y superficie.
- Al cargar una nueva imagen se leen sus dimensiones naturales y se reinician puntos/escala para evitar referencias de otra captura.
