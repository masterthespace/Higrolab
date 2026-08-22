# HIDROLAB V8.2.4 — Flujo corregido + vapor representativo

## Corrección crítica
V8.2.3 intentaba leer d.wall.rTotal y d.wall.U, pero data() entrega rTotal y U directamente.
Esto detenía render() y dejaba en blanco:
- flujo gráfico;
- Estado superficial;
- curva de HR superficial;
- lectura gráfica del muro.

Corregido a d.rTotal y d.U.

## Nuevo estimador de carga de humedad
- Personas individualizadas (hasta 8).
- Cada persona tiene actividad: reposo, ligera o moderada.
- Cada persona puede estar además cocinando o duchándose.
- Cocinar tiene una duración propia; ya no se multiplica por todas las horas de persistencia.
- Ducha se calcula por evento: 0,66 L por ducha.
- Ropa secándose: 1,8 L por carga.
- Estufa rápida: gas o parafina con horas de uso.
- Supuestos alineados con los utilizados en el módulo Ventilación y humedad.
- El desglose muestra cuánto aporta cada persona y cada fuente.

La carga de vapor sigue siendo contexto y NO modifica automáticamente la HR interior ni el punto de rocío sin un balance completo de humedad.
