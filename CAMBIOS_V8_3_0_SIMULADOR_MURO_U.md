# HIDROLAB V8.3.0 — Simulador de muro + U (prueba)

Cambios principales:
- Biblioteca de materiales con origen visible del valor lambda.
- Hormigón armado normal: lambda 1,63 W/mK (referencia NCh853:2021 utilizada en HIDROLAB).
- EPS unificado a lambda 0,038 W/mK como valor orientativo; se pide usar dato declarado de producto.
- Cálculo 1D homogéneo mantiene R=e/lambda, Rt=Rsi+sumR+Rse, U=1/Rt.
- Nuevo modo “Entramado simplificado”: capa seleccionada + fracción de montantes + lambda del montante.
- Gráfico didáctico de aporte porcentual de R por capa.
- Explicación práctica de qué significa U.
- Comparación opcional para muro residencial por zona térmica A-I según OGUC vigente.
- La comparación se presenta como evaluación del parámetro U/Rt, no como certificación integral.
- PDF específico del módulo: muro exacto, capas, espesores, lambda, R, fuentes, U/Rt, mejora de aislación, comparación opcional y alcance técnico.
