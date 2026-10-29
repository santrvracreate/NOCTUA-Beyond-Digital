-- Auditoría de permisos por rol para NOCTUA
--
-- Este proyecto ya relaciona public.perfiles.id con auth.users(id).
-- Por ello no se agrega una columna id_auth: perfiles.id es el UUID que
-- auth.uid() devuelve para la persona que ejecuta la solicitud.
--
-- Antes de ejecutar cambios, consultar las políticas activas. Una política
-- FOR ALL que también permita DELETE debe sustituirse; de otro modo, la nueva
-- política restrictiva no tendría efecto porque las políticas permisivas se
-- combinan con OR.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'proyectos'
order by policyname;

-- Resultado de la auditoría del 22 de octubre de 2026: el proyecto ya utiliza
-- políticas separadas y no tiene una política FOR ALL que habilite DELETE.
-- La política existente proyectos_elimina_solo_admin llama a private.es_admin().
--
-- Implementación vigente (la cláusula TO evita aplicar la regla a peticiones
-- anónimas y la función privada comprueba el rol almacenado en perfiles):
--
-- CREATE POLICY "proyectos_elimina_solo_admin"
-- ON public.proyectos
-- FOR DELETE
-- TO authenticated
-- USING ((SELECT private.es_admin()));
--
-- Si una auditoría futura muestra una política FOR ALL que permita DELETE,
-- eliminarla por su nombre exacto y recrear sus permisos no-DELETE como
-- políticas separadas. No eliminar políticas a ciegas: las políticas actuales
-- también contienen las reglas para proyectos públicos y del cliente.

-- Verificación posterior a la ejecución:
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'proyectos'
order by policyname;
