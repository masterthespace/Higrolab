# HIDROLAB V6.3.12 — PDF usa exactamente el mismo Modelo 3D

## Corrección definitiva de orientación en el informe

Se elimina el esquema 2D reconstruido de identificación de fachadas.

La sección `Visualizaciones e identificación de fachadas` ahora:
- captura directamente el mismo canvas WebGL del Modelo 3D que ve el usuario;
- usa exactamente la misma cámara, rotación, Norte y geometría;
- superpone F1, F2, F3… mediante proyección desde los mismos puntos 3D;
- agrega C1 sobre la cubierta;
- conserva orientación y azimut calculados por el mismo motor;
- no aplica una segunda transformación 2D.

Por lo tanto, la orientación de las fachadas en el PDF no puede quedar invertida
respecto del Modelo 3D: ambos provienen de la misma escena y la misma cámara.
