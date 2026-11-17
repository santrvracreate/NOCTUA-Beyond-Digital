-- Cada mensaje pertenece a la conversación del cliente indicado por id_usuario.
-- Los registros anteriores fueron enviados por clientes.
alter table public.mensajes
  add column remitente text not null default 'cliente';

alter table public.mensajes
  add constraint mensajes_remitente_valido
  check (remitente in ('cliente', 'admin'));

-- Impide que un cliente se haga pasar por el administrador.
create policy mensajes_remitente_segun_rol
on public.mensajes as restrictive for insert to authenticated
with check (
  ((select private.es_admin()) and remitente = 'admin')
  or (id_usuario = (select auth.uid()) and remitente = 'cliente')
);

create index if not exists idx_mensajes_usuario_fecha
  on public.mensajes(id_usuario, created_at desc, id desc);
