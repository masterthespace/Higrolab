# HIDROLAB V7.2.1 — Persistencia manual en horas

En el Evaluador de riesgo de humedad superficial persistente se mantiene el selector original y se agrega:

`Ingresar horas manualmente`

El usuario puede ingresar entre 0 y 24 horas/día, con pasos de 0,5 h.

## Cálculo
Para el modo manual:
`penalización por persistencia = 15 × horas / 24`

Por lo tanto:
- 0 h = +0 puntos
- 8 h = +5 puntos
- 16 h = +10 puntos
- 24 h = +15 puntos

El valor se incorpora directamente al Índice preventivo HIDROLAB y se muestra en pantalla.
Las cuatro opciones originales mantienen su comportamiento previo (+0, +5, +10, +15).
