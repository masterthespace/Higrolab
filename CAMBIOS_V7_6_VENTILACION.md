# HIDROLAB V7.6 — Deshumidificador + agua retirada + punto de rocío

## Deshumidificador en modo práctico
Se agrega una estrategia `Deshumidificador`.
Preset inicial:
- 25 L/24 h nominales.
- Estanque 4 L.
- Factor real de trabajo editable (55% inicial) para no asumir que la capacidad nominal se alcanza en toda condición doméstica.
- Tiempos: 1, 2, 4 y 8 horas.

## Sección 06
El antiguo comparador técnico se reemplaza por `Agua retirada del aire`:
- gramos retirados;
- litros equivalentes;
- humedad absoluta inicial/final [g/m³];
- diferencia retirada [g/m³];
- visual de botella.

## Sección 07
Nueva sección `Punto de rocío y riesgo superficial`:
- temperatura superficial de referencia;
- punto de rocío antes/después;
- margen superficial antes/después;
- escala gráfica de superficie vs punto de rocío;
- interpretación de condensación posible / margen bajo / atención / bajo.

## ACH
La interfaz explica ACH como renovaciones de aire por hora.
1 ACH = mover en una hora un volumen de aire igual al volumen total del recinto.
