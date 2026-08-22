# HIDROLAB V8.2.5 — Balance de vapor

Cambios:
- Actividades cotidianas por persona: dormir, TV/leer, computador, actividad ligera, limpiar, ejercicio moderado e intenso.
- Mantiene acciones adicionales separadas (cocinar/ducharse) para evitar doble conteo conceptual.
- Nuevo modo opcional “Simular efecto del vapor sobre el ambiente”.
- Usa Ti y HR iniciales ya ingresadas en el módulo.
- Solicita volumen del recinto, escenario de ACH, temperatura y HR exterior.
- Calcula HR final estimada, punto de rocío final, humedad absoluta y exceso sobre saturación.
- Compara el nuevo punto de rocío con la temperatura superficial del muro.
- La simulación no reemplaza el diagnóstico principal ni se presenta como cálculo normativo.

Referencias metodológicas:
- ASHRAE Handbook 2025, Moisture Management in Buildings: rangos de vapor de ocupantes y fuentes domésticas.
- Balance de humedad simplificado de recinto perfectamente mezclado.
