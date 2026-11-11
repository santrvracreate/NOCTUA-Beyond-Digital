# Guía 14 — Autenticación en el portafolio

## Cuenta existente

- Administrador: `orellanasantiago382@gmail.com` (rol `admin` en `public.perfiles`).
- No se guardan contraseñas en este repositorio.
- Las cuentas nuevas se crean desde el formulario del sitio con rol `usuario`. Se piden nombre, correo, teléfono y contraseña. El ID lo genera Supabase Auth; los triggers crean automáticamente `perfiles` y `clientes` con ese mismo ID y guardan el teléfono en `clientes.telefono`.

## Flujo implementado

- Al cargar la página, `getSession()` comprueba la sesión guardada. El formulario de acceso y el área administrativa empiezan ocultos hasta terminar la comprobación.
- `signInWithPassword()` muestra un error genérico si las credenciales fallan.
- El formulario conserva la referencia al elemento antes de esperar a Supabase; así puede limpiarse después de un registro o ingreso exitoso sin depender de `event.currentTarget` tras el `await`.
- El rol se lee de `public.perfiles`. `admin` gestiona proyectos, usuarios y mensajes; `usuario` ve proyectos detallados y envía mensajes; el visitante solo ve un resumen.
- `signOut()` vuelve al estado de visitante. El listado público permanece visible, porque el portafolio sí permite proyectos publicados sin cuenta.
- La portada muestra fichas: el visitante solo recibe el nombre de proyectos completados y publicados; los usuarios registrados consultan el detalle autorizado; el administrador puede crear, editar y publicar. No se muestran enlaces a páginas hasta disponer de URLs reales.
- El reto de cambio de contraseña usa `updateUser({ password })` para cualquier cuenta iniciada. El formulario no almacena la contraseña.

## Prueba de RLS sin sesión

El 14 de octubre de 2026 se consultó la API REST con la clave pública y sin sesión de usuario:

| Tabla | Resultado | Interpretación |
| --- | --- | --- |
| `clientes?select=id` | HTTP 401 | La información de clientes no está disponible para visitantes. |
| `proyectos?select=id,nombre` | HTTP 200 | El visitante puede leer el resumen de proyectos publicados y completados. |
| `proyectos?select=id,nombre,descripcion` | HTTP 401 | El visitante no puede pedir la descripción por API. |
| `mensajes?select=id` | HTTP 401 | El visitante no puede leer mensajes. |

En este portafolio, el resultado anónimo de `proyectos` no debe ser un error: su política RLS permite el portafolio público. La consulta equivalente con sesión administrativa y la prueba real de cambio de contraseña requieren iniciar sesión manualmente con la contraseña del administrador; no se realizó esa prueba desde esta revisión.

La portada muestra los proyectos completados y publicados que devuelve la base de datos. Si no hay coincidencias, muestra un estado vacío; no convierte proyectos privados o cancelados en ejemplos públicos.

## Reflexión

En `const { data: { session } } = await supabaseClient.auth.getSession()`, `session` representa la sesión de la cuenta iniciada o `null` si no existe. El destructuring es anidado porque Supabase devuelve un objeto exterior con la propiedad `data`, y dentro de `data` está `session`.

El formulario de cambio de contraseña reutiliza el patrón del login: `preventDefault()`, lectura del campo, llamada asíncrona, revisión de `error` y mensaje al usuario. La llamada diferente es `supabaseClient.auth.updateUser({ password: nuevaContrasena })`.
