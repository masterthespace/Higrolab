# HIDROLAB V8.2.8 — Riesgo de humedad superficial simplificado

- Se elimina completamente del módulo 03 la lógica de personas, cocina, duchas, ropa, estufas y carga de vapor por período.
- Ese contenido queda reservado al módulo Ventilación y humedad.
- El módulo 03 ahora se concentra en el estado actual:
  - humedad absoluta interior [g/m³];
  - agua contenida en el aire [L eq.] según volumen;
  - capacidad a saturación;
  - margen hasta saturación;
  - punto de rocío;
  - HR superficial estimada al enfriarse el mismo aire junto al muro.
- Nueva relación visual:
  Aire interior Ti/HR -> mismo contenido de vapor -> enfriamiento junto al muro -> HR superficial.
- Mantiene muro interactivo, perfil térmico por capas, temperaturas de interfaces, U, Tsi y punto de rocío.
- Mantiene el gráfico 04 modernizado de V8.2.7.
