# HIDROLAB V6.3.2 — Solar Studio funcional

La V6.3.1 fallaba antes de ejecutar la inicialización porque el archivo externo
de controles 3D intentaba importar `three` mediante un especificador que el navegador
no podía resolver sin import map.

Se eliminó esa dependencia y se incorporó un control orbital propio.
Región, Comuna, carga de imagen, editor de planta y controles vuelven a arrancar
desde el mismo módulo. El estado superior cambia a `Módulo activo` al iniciar.
