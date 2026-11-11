# Acceso y diseño de NOCTUA

## Identidad visual

El diseño oficial es claro permanente: blanco, negro y escala de grises. Se eliminó el selector de temas y su lógica JavaScript. Los componentes comparten variables de color en `css/styles.css`.

El búho original de `logos/logo-dia.jpeg` se encuadra mediante CSS, sin deformarlo ni cortar sus alas. En el encabezado acompaña al nombre NOCTUA; en la portada ocupa un espacio propio con líneas orbitales. Un filtro de escala de grises conserva la identidad monocromática. Los archivos originales del logo se conservan.

La composición usa Space Grotesk para títulos y Manrope para lectura, con tipografías de sistema como respaldo. Tarjetas, formularios, indicadores y paneles comparten espaciados, bordes y estados de foco. Incluye adaptación a móvil, enlace para saltar al contenido, controles de al menos 44 px y respeto por la preferencia de movimiento reducido. El ajuste del encabezado conserva el símbolo también a 320 px.

## Acceso de clientes

El acceso usa correo y contraseña. El formulario de registro solicita nombre, correo, teléfono y contraseña; `signUp()` envía nombre y teléfono como metadatos para los triggers existentes que crean `perfiles` y `clientes`. Si la confirmación de correo está activa, el usuario debe confirmar el mensaje antes de entrar. El administrador conserva su cuenta y su rol en `public.perfiles`.

El sitio no ofrece acceso con Google. Las políticas RLS siguen determinando qué datos puede ver y modificar cada rol; el diseño de la página no reemplaza esos controles.
