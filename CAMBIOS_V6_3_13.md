# HIDROLAB V6.3.13 — Esquema PDF limpio y orientación 3D real

Se recupera el estilo visual del esquema 2D que se utilizaba originalmente:
- planta limpia;
- flecha Norte roja;
- F1, F2, F3…;
- C1 para cubierta;
- orientación y azimut bajo cada fachada.

La corrección clave es que la geometría ya no se rota con una fórmula 2D aparte.
Cada vértice y cada punto medio de fachada se transforma con la matriz real
`buildingGroup.matrixWorld` del mismo modelo Three.js.

Luego se genera una vista superior X/Z. De esta forma:
- el esquema mantiene el estilo limpio del informe anterior;
- Norte queda fijo hacia arriba;
- la orientación coincide con el modelo 3D;
- no existe una segunda interpretación independiente del giro del edificio.
