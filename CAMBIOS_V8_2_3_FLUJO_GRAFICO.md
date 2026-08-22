# HIDROLAB V8.2.3 — Flujo gráfico de riesgo superficial

- Reordena conceptualmente el módulo:
  Aire interior (Ti + HR) -> punto de rocío.
  Muro (capas + espesores + lambda) -> R/U -> temperatura superficial.
  Ambos convergen en la comparación Tsi vs punto de rocío.
- Recupera una visualización gráfica dinámica del muro, exterior -> interior.
- La gráfica cambia en tiempo real al modificar material, espesor, lambda u orden.
- Se separa el estimador de vapor como "Carga de humedad del período".
- Se aclara que el vapor acumulado NO modifica automáticamente HR/punto de rocío sin un balance de humedad completo (volumen + ventilación + estado inicial).
- Mantiene trazabilidad normativa V8.2 y correcciones de capas/botones de V8.2.1/V8.2.2.
