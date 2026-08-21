# HIDROLAB V7.2.2 — Vapor liberado acumulado

Cuando el usuario selecciona `Persistencia manual`, el módulo muestra un estimador visual adicional.

Entradas:
- número de personas;
- generación de vapor por persona [g/h], editable;
- otras fuentes de humedad [g/h], editable;
- horas de persistencia manual ya ingresadas.

Cálculo:
`masa de agua [g] = horas × (personas × g/h por persona + otras fuentes g/h)`

Luego:
`litros equivalentes ≈ masa [kg]`, usando 1 kg de agua ≈ 1 L.

El valor inicial por persona es 60 g/h para actividad ligera como referencia orientativa.
La interfaz aclara que se trata de agua liberada acumulada, no de agua necesariamente presente simultáneamente en el aire.
