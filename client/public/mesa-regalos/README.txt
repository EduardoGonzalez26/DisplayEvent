IMÁGENES DE LA MESA DE REGALOS
==============================

Esta carpeta alimenta la sección "Mesa de Regalos" de la invitación
(tarjetas de regalo sorpresa y lluvia de sobres).

IMÁGENES INCLUIDAS POR DEFECTO (2)
  El diseño YA incluye estas 2 ilustraciones en formato SVG (line art
  dorado/rosa, fondo transparente). No hay que hacer nada para que se
  vean: son el valor por defecto de la sección.
    1. regalo-sorpresa.svg   -> tarjeta "Regalo"
    2. lluvia-de-sobres.svg  -> tarjeta "Lluvia de sobres"

REEMPLAZAR UNA ILUSTRACIÓN (OPCIONAL)
  Basta con copiar en esta carpeta una imagen propia con el MISMO
  NOMBRE BASE de la lista anterior y extensión .png, .webp, .jpg o
  .jpeg. Ejemplos:
      regalo-sorpresa.png
      lluvia-de-sobres.webp
  IMPORTANTE: si existe un archivo raster con el mismo nombre base,
  TIENE PRIORIDAD sobre nuestro SVG (la sección intenta en este orden:
  .png -> .webp -> .jpg -> .jpeg -> .svg). Para volver a la ilustración
  por defecto, borra el raster que hayas copiado.

FORMATO RECOMENDADO PARA LAS IMÁGENES PROPIAS
  - PNG (o WebP) cuadrado 1:1, de 512x512 o 1024x1024 px.
  - Fondo transparente (ideal). Si es un dibujo o escaneo en papel, el
    fondo BLANCO también funciona perfecto: las tarjetas del diseño
    son blancas.
  - En pantalla las imágenes se muestran a ~112-128 px, así que con
    512x512 se ven nítidas incluso en pantallas de alta densidad.

SIN IMÁGENES (CASO EXTREMO)
  Si no existiera ni SVG ni raster, la sección muestra un ornamento
  dorado elegante dentro del medallón (nunca una imagen rota).

EN LOCAL (npm run dev)
  Vite sirve el contenido de esta carpeta al instante: agrega o
  reemplaza archivos y recarga el navegador (Ctrl + F5).

EN PRODUCCIÓN
  Esta carpeta se copia a la carpeta dist/ al construir. Si agregas o
  cambias imágenes después de desplegar, hay que reconstruir y volver
  a subir el contenido de client/dist/:
      npm run build
