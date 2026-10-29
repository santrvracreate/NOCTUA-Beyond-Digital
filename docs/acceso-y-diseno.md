# Acceso y diseño de NOCTUA

## Identidad visual

El sitio abre en modo oscuro: fondo negro, superficies oscuras y detalles azul marino. El botón de tema permite cambiar al modo claro. El búho de los archivos `logos/logo-dia.jpeg` y `logos/logo-noche.jpg` se muestra completo, sin cortar las alas, y destaca en la portada.

## Acceso de clientes

El acceso usa correo y contraseña. El formulario de registro solicita nombre, correo, teléfono y contraseña; `signUp()` envía nombre y teléfono como metadatos para los triggers existentes que crean `perfiles` y `clientes`. Si la confirmación de correo está activa, el usuario debe confirmar el mensaje antes de entrar. El administrador conserva su cuenta y su rol en `public.perfiles`.

El sitio no ofrece acceso con Google. Las políticas RLS siguen determinando qué datos puede ver y modificar cada rol; el diseño de la página no reemplaza esos controles.
