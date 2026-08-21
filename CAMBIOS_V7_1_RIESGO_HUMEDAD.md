# HIDROLAB V7.1 — Evaluador de riesgo de humedad superficial

El módulo funciona de manera completamente independiente.

## Cambios
- Se renombra `Temperatura superficial` a `Temperatura superficial interior del muro`.
- Dos modos de trabajo: `Temperatura medida` y `Temperatura estimada`.
- Modo estimado usa Ti, Te y U del muro:
  `Tsi = Ti − U · Rsi · (Ti − Te)`.
- Rsi usada: 0,13 m²K/W para superficie interior vertical.
- Presets orientativos de U para usuarios que no conocen la transmitancia.
- La HR exterior no se solicita porque no interviene en esta estimación térmica simplificada.
- Índice preventivo HIDROLAB ahora cambia coherentemente:
  - 0–39 verde
  - 40–59 amarillo
  - 60–79 naranjo
  - 80–100 rojo
- El color del número y de la barra se sincroniza con el nivel de riesgo.
- Resultado indica si la temperatura superficial fue medida o estimada.
- El gráfico usa la misma temperatura superficial activa del análisis.
