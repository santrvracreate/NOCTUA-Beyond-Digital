# Configuración de Supabase (Guía 9)

**Nombre del proyecto:** sistem-portafoleo
**Región elegida:** us-east-2

## Tablas creadas

Las siguientes tablas fueron creadas en la base de datos de Supabase.

**Creadas con Table Editor:**

- `clientes`
- `categorias`
- `proyectos`
- `solicitudes`

`auth.users` es una tabla interna de Supabase Auth. El esquema público también incluye `perfiles` para los roles.

## Row Level Security (RLS)

RLS está activa en todas las tablas públicas, incluida `mensajes`. Los visitantes solo reciben ID y nombre de proyectos publicados y completados. Los usuarios registrados ven el detalle de esos proyectos y de los propios, y pueden enviar mensajes al administrador; no pueden editar proyectos ni roles. Los administradores gestionan proyectos, roles y mensajes. Las funciones privilegiadas están en el esquema privado `private`.
