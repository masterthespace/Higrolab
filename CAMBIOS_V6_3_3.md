# HIDROLAB V6.3.3 — Selección 3D y asoleamiento por fachada

## Mejoras principales
- Selección real por clic de fachadas en los visores 3D y Análisis Solar.
- Selección de vértices en 3D.
- Resaltado sincronizado de la fachada seleccionada en ambos visores.
- Inspector con longitud, azimut, orientación y estado de sol directo.
- Cálculo diario de horas de sol directo por fachada para la fecha y ubicación elegidas.
- El cálculo de horas utiliza el punto medio de cada fachada e incorpora autosombra de la propia geometría mediante ray casting.
- Panel inferior con horas totales, primer/último sol y línea de tiempo diaria de cada fachada.
- Trayectoria solar 3D visible y esfera del sol actual.
- No se agregan etiquetas gigantes dentro del modelo: la información técnica se concentra en el inspector y panel inferior.

## Alcance
El cálculo de horas de asoleamiento no incluye todavía obstáculos externos (edificios vecinos, árboles o topografía). Estos se incorporarán como objetos en una etapa posterior.
