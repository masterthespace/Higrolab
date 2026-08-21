# HIDROLAB V6.3.7 — Escala 3D coherente

Se corrige la percepción de escala del modelo sin alterar las dimensiones reales.

## Cambios
- La altura indicada (2,00 m, 2,40 m, 3,00 m, etc.) permanece en escala 1:1 respecto de la planta.
- La cámara se encuadra automáticamente usando las dimensiones reales del volumen.
- El punto de mira se posiciona aproximadamente a media altura del edificio.
- La cuadrícula se redimensiona según el tamaño de la planta.
- Cada cuadrícula menor corresponde a 1 metro.
- El plano de terreno se adapta al tamaño real del proyecto.
- La flecha Norte se escala al contexto del modelo.
- Se incorpora una referencia humana de 1,56 m para ayudar a percibir la altura.
- Se agrega un HUD indicando cuadrícula, altura y tamaño máximo de planta.
- Las vistas 3D, Planta superior, Norte, Este y Oeste calculan su distancia automáticamente según el edificio.
- Al modificar altura, geometría o calibración, el visor vuelve a encuadrar el modelo de manera coherente.

No se aplica exageración vertical: un muro de 2 m sigue siendo exactamente 2 m.
