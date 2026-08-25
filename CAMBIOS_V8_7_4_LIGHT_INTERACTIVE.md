# HIDROLAB V8.7.4 — Light Interactive UI + Google Static Maps

Base: V8.7.3 estable.

## Sistema visual
- nueva capa `assets/hidrolab-light-ui.css`;
- fondos blancos / gris muy claro;
- tipografía y jerarquía visual reforzada;
- tarjetas blancas con sombras sutiles;
- mayor respuesta visual al hover;
- colores por fenómeno:
  - humedad: cyan;
  - envolvente: naranja técnico;
  - Solar Studio: ocre solar;
  - zona interactiva: violeta;
- botones e inputs más claros;
- resultados mantienen prioridad visual;
- no se cambian fórmulas ni estructuras funcionales.

## Solar Studio
Se mantiene:
- JPG / PNG;
- Google Maps interactivo.

Se agrega:
- Google Maps Static API como fondo visual trazable en la vista PLANTA;
- selector de zoom y tipo Satélite / Híbrido / Mapa;
- API key ingresada por el usuario;
- opción de recordar la clave solo en el navegador;
- botón "Cargar referencia en PLANTA";
- botón para quitar solo esa referencia;
- la imagen de Google se mantiene fuera del canvas técnico para evitar contaminar la exportación del canvas;
- la calibración y el trazado funcionan por encima de la referencia.

## Requisito
Para cargar una imagen estática de Google en la planta se necesita:
- API key de Google Maps Platform;
- Maps Static API habilitada;
- recomendable restringir la clave al dominio de HIDROLAB.

La vista Google Maps embebida sigue funcionando independientemente de esta clave.
