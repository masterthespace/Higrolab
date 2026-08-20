# HIDROLAB V6.2 · Simulador solar afinado por módulo

Esta revisión reemplaza el cubo abstracto del módulo solar por un flujo de trabajo basado en la planta real aproximada de la vivienda.

## Simulador Solar Avanzado

- Permite cargar una captura satelital o plano en JPG/PNG/WebP.
- Permite indicar Norte arriba o calibrar el Norte mediante dos clics sobre la imagen.
- Permite dibujar una planta poligonal irregular haciendo clic en cada vértice.
- Calcula automáticamente el azimut de cada fachada respecto del Norte geográfico.
- Permite calibrar escala mediante dos puntos y una distancia real conocida.
- Extruye la planta dibujada utilizando la altura de muros indicada y genera un volumen 3D aproximado.
- Si no se calibra escala, conserva la forma y usa Ancho/Largo simple como referencia dimensional.
- Mantiene cámara orbital independiente de la orientación real del edificio.
- Admite coordenadas de Google Maps pegadas en formato DMS, por ejemplo 33°35'46.9\"S 70°52'32.2\"W, o en grados decimales.
- La exposición solar, línea de tiempo y diseñador de aleros se adaptan a la cantidad de fachadas de la planta dibujada.

La geometría obtenida es una aproximación de diseño y no reemplaza levantamientos topográficos, BIM ni procedimientos oficiales CEV/FAV/FAR.
