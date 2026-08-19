# HIDROLAB · Suite completa

Proyecto estático listo para GitHub + Vercel.

## Páginas
- `index.html` — inicio
- `calculadoras.html` — catálogo de herramientas
- `calculadora-rocio.html` — punto de rocío con temperatura de muro
- `calculadora-sin-muro.html` — riesgo sin temperatura superficial medida
- `riesgo-moho.html` — humedad superficial persistente / indicador preventivo
- `ventilacion-humedad.html` — balance de vapor, caudal y ACH
- `simulador-muro.html` — capas, R, U, temperatura superficial y mejora con aislación
- `perdidas-termicas.html` — pérdidas por transmisión + ventilación
- `comparador-u.html` — comparación configurable con U límite de referencia
- `confort-termico.html` — PMV/PPD
- `costo-calefaccion.html` — consumo y costo eléctrico según COP y tarifa
- `zona-interactiva.html` — galería preparada para videos

## Reemplazar el proyecto anterior
1. Descarga y descomprime el ZIP completo.
2. En el repositorio GitHub conectado a Vercel, elimina/reemplaza los archivos anteriores.
3. Sube **el contenido de esta carpeta directamente a la raíz** del repositorio.
4. Haz Commit en la rama de producción.
5. Vercel desplegará el commit automáticamente si el repositorio sigue conectado.

## Alcance técnico
Las herramientas son educativas/técnicas de cálculo simplificado. Los valores de conductividad térmica predefinidos son orientativos y editables. El comparador U no incorpora límites legales precargados: el usuario debe ingresar el límite vigente que corresponda a su proyecto o normativa.

## Informes PDF

Las calculadoras incorporan exportación de informes mediante el diálogo de impresión del navegador. Los informes incluyen marca de agua HIDROLAB y el pie "Calificador CEV Gonzalo C.". Consulta `REPORTES_PDF.md`.

### V2 - Corrección del generador de informes
El módulo de informes detecta correctamente las rutas limpias de Vercel, por ejemplo `/calculadora-rocio` además de `/calculadora-rocio.html`.

## V3 — Condensación interactiva en Simulador de muro
La página `simulador-muro.html` incorpora ahora:
- Comparación en tiempo real de temperatura superficial antes/después de aislar.
- HR superficial estimada antes/después.
- Escala visual con punto de rocío, muro actual y muro mejorado.
- Representación gráfica del muro donde la capa de aislación cambia de espesor con el slider.
- Indicador textual de cuántos °C la superficie queda por encima o debajo del punto de rocío.
- Buscador de espesor mínimo estimado para lograr +1, +2, +3 o +4 °C de margen sobre el punto de rocío.
- Animación automática del slider al espesor mínimo calculado.

El análisis corresponde a condensación superficial mediante un modelo térmico 1D estacionario simplificado. No evalúa condensación intersticial dentro del cerramiento.


## V4 — Perfil térmico y controles mejorados
- El área del muro ahora indica explícitamente **m²** y aclara que solo afecta la pérdida total en W.
- El margen objetivo de condensación se puede ajustar entre **+0,5 °C y +10 °C** en pasos de 0,5 °C, con slider y entrada numérica.
- El perfil térmico muestra la **temperatura en cada punto**: aire exterior, superficie exterior, interfaces/capas, superficie interior y aire interior.
- El gráfico conserva la línea del punto de rocío y las etiquetas se incorporan también al informe PDF al capturar el SVG.
