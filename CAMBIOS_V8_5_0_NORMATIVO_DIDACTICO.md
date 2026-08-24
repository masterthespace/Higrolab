# HIDROLAB V8.5.0 — Simulador de muro + U

## Objetivo
Aumentar el respaldo normativo sin eliminar la experiencia didáctica e interactiva.

## Cambios
- Se conserva Arma tu muro, perfiles, gráficos, comparador de aislación, asistente de espesor, mapa térmico, colores e informe PDF.
- Capas continuas: mantiene R=e/λ, Rt y U.
- Entramado: reemplaza la ponderación simple anterior por método combinado:
  - Rt límite inferior.
  - Rt límite superior.
  - Rt promedio.
  - error relativo.
  - validación automática del criterio ≤20%.
- Si el error supera 20%, HIDROLAB no oculta el resultado, pero lo marca como no válido para esa vía y explica que corresponde método detallado NCh853 u otra alternativa admitida.
- Nueva tarjeta “¿Qué tan normativo es este cálculo?” que separa:
  - material con fuente normativa,
  - producto con R declarado,
  - dato orientativo,
  - dato personalizado.
- El PDF incorpora los límites, promedio, error y estado de validez del entramado.
- Se mantiene el perfil térmico como lectura física/didáctica y la comparación OGUC como evaluación exclusiva U/Rt.

## Referencias de diseño técnico
- NCh853 oficializada por MINVU, según condiciones de cálculo de Res. Ex. 1802/2025.
- Manual de Procedimientos CEV 2025: U de la solución constructiva completa y puentes térmicos constructivos incorporados.
- OGUC art. 4.1.10 vigente: exigencias U/Rt por zona térmica y alcance integral de la reglamentación.
