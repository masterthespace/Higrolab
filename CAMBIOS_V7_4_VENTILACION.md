# HIDROLAB V7.4 — Ventilación recomendada y simulación temporal

Cambios principales:
- `HR interior objetivo` se renombra a `Humedad relativa interior objetivo [%]` y se explica que no es temperatura.
- Se elimina la presión atmosférica del formulario común.
- El balance usa humedad absoluta [g/m³], por lo que el usuario no necesita conocer presión atmosférica.
- Nueva recomendación de ventilación según si el aire exterior es realmente más seco en humedad absoluta.
- Simulación de ventilación cruzada para 5, 10, 15 y 30 minutos.
- Slider de caudal estimado de ventilación cruzada.
- Cálculo de reducción del exceso de vapor, HR antes/después, gramos retirados y renovaciones de aire.
- Gráfico temporal de HR durante la ventilación.
- La vivienda SVG cambia de aspecto hacia verde cuando la HR estimada entra a zona controlada.
- Se mantiene comparación de caudal actual vs propuesto y capacidad de secado del aire exterior.

Modelo temporal: mezcla perfecta sin generación adicional durante el periodo de ventilación:
AH(t)=AH_ext+(AH_0-AH_ext)*exp(-ACH*t).
El caudal de ventilación cruzada es un escenario simulado: el real depende de aperturas, viento, orientación y presión.
