# HIDROLAB V7.5 — Ventilación práctica unificada

Se unifican los antiguos bloques de caudal, resultado y ventilación recomendada.

## Flujo principal
1. El usuario selecciona cómo ventilará:
   - una ventana;
   - dos ventanas cruzadas;
   - ventana + puerta;
   - extractor / ventilador.
2. Para ventilación natural ingresa:
   - ancho y alto útil de abertura;
   - porcentaje de apertura;
   - condición de viento.
3. HIDROLAB estima:
   - área útil;
   - caudal central y rango orientativo;
   - ACH durante la apertura.
4. El usuario selecciona 4, 5, 10, 15, 20 o 30 min.
5. Ese MISMO caudal alimenta la simulación temporal, HR posterior, vapor retirado y recomendación.

## Modo técnico
Permite ingresar m³/h directamente si el caudal es conocido.

## Modelo temporal
AH(t)=AHext+(AH0-AHext)*exp(-ACH*t)

## Advertencia
Los caudales naturales son estimaciones; el valor real depende de viento, orientación, presión, obstáculos y geometría real. Se muestra un rango para evitar falsa precisión.
