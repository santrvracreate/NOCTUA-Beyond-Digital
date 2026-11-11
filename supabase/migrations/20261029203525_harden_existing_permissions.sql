-- Aplicada al proyecto sistem-portafoleo el 3 de noviembre de 2026.
-- No elimina registros ni cambia identificadores. Complementa las políticas permisivas.
begin;
create policy solicitudes_validar_al_crear on public.solicitudes
as restrictive for insert to authenticated
with check (
  (select private.es_admin()) or (
    id_cliente = (select auth.uid()) and estado = 'pendiente'
    and (id_proyecto is null or exists (
      select 1 from public.proyectos p
      where p.id = id_proyecto and p.id_cliente = (select auth.uid())
    ))
  )
);

create or replace function private.proteger_rol_propio()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.id = auth.uid() and new.rol is distinct from old.rol then
    raise exception 'No se permite modificar el propio rol' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.proteger_rol_propio() from public, anon, authenticated;
create trigger perfiles_proteger_rol_propio before update of rol on public.perfiles
for each row execute function private.proteger_rol_propio();
create index if not exists idx_proyectos_created_at_id on public.proyectos(created_at desc, id desc);
create index if not exists idx_mensajes_created_at_id on public.mensajes(created_at desc, id desc);
commit;
