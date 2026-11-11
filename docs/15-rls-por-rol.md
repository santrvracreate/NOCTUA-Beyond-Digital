# Seguridad y permisos por rol

## Modelo de acceso de NOCTUA

`public.perfiles.id` es clave primaria y clave foránea hacia `auth.users(id)`. Los triggers de registro crean el perfil con el mismo UUID que genera Supabase Auth. El sistema utiliza ese identificador para decidir los permisos de cada solicitud.

El administrador gestiona proyectos, clientes, permisos y mensajes. Cada cliente solo consulta su información autorizada, sus proyectos asignados y puede enviar mensajes. Los visitantes únicamente ven proyectos publicados y completados.

## Política implementada

El SQL de trabajo está en `docs/sql/15-rls-por-rol.sql`. La condición central de la política es:

```sql
WHERE perfiles.id = (SELECT auth.uid())
  AND perfiles.rol = 'admin'
```

La instancia implementa el mismo patrón mediante una función privada reutilizable:

```sql
CREATE POLICY "proyectos_elimina_solo_admin"
ON public.proyectos
FOR DELETE
TO authenticated
USING ((SELECT private.es_admin()));
```

La función `private.es_admin()` contiene la comprobación de rol:

```sql
SELECT EXISTS (
  SELECT 1
  FROM public.perfiles
  WHERE id = (SELECT auth.uid())
    AND rol = 'admin'
);
```

`auth.uid()` representa el UUID de la cuenta autenticada que hace la solicitud en ese instante. Se compara con `perfiles.id` porque ambos contienen el identificador de `auth.users`; no se compara con el ID numérico de `proyectos`, que identifica el recurso y no a quien solicita la operación.

La cláusula `TO authenticated` limita la política a sesiones iniciadas. `EXISTS` confirma que existe un perfil asociado al UUID de la sesión y que su rol es exactamente `admin`.

## Control de políticas existentes

Las políticas RLS permisivas se combinan mediante OR. La auditoría confirmó que `proyectos` tiene políticas separadas para `SELECT`, `INSERT`, `UPDATE` y `DELETE`; no existe una política amplia `FOR ALL` que deje el borrado abierto. La regla de eliminación es la única aplicable a `DELETE` y está dirigida a `authenticated`.

## Estado de la práctica

- El 22 de octubre de 2026 se preparó el SQL y esta documentación.
- La instancia `sistem-portafoleo` estaba en estado **INACTIVE** y fue reactivada para la auditoría.
- Tras finalizar la inicialización, se verificaron las tablas públicas, RLS y las políticas existentes.
- `proyectos_elimina_solo_admin` ya está activa, está dirigida al rol `authenticated` y llama a `private.es_admin()`.
- La función privada consulta `public.perfiles` con `id = auth.uid()` y `rol = 'admin'`; por tanto, cumple la restricción solicitada sin duplicar la lógica en cada tabla.

## Pruebas con dos cuentas temporales

| Cuenta | Acción | Resultado esperado |
| --- | --- | --- |
| Cliente (`usuario`) | Intentar eliminar un proyecto de prueba | No se elimina ninguna fila; la interfaz muestra que no se pudo eliminar. |
| Administrador (`admin`) | Eliminar el mismo proyecto de prueba | La fila se elimina y deja de aparecer tras recargar el listado. |

El 3 de noviembre de 2026 se iniciaron sesiones reales con cuentas temporales de cliente y administrador. El cliente no pudo borrar el proyecto; el administrador lo editó y eliminó desde la interfaz. También se verificó que el cliente no puede asociar una solicitud a un proyecto ajeno y que un administrador no puede cambiar su propio rol. Se eliminaron las cuentas y registros temporales al terminar. La protección principal es RLS; ocultar botones en la interfaz solo mejora la experiencia y no reemplaza la seguridad de la base de datos.
