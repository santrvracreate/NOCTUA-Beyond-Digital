-- Indicadores de proyectos para NOCTUA.
-- Cambiar únicamente las dos fechas del CTE antes de ejecutar en SQL Editor.
-- El límite superior exclusivo incluye por completo el último día elegido.

-- Total de proyectos creados en el periodo.
with periodo as (
  select date '2026-10-01' as desde, date '2026-10-31' as hasta
)
select count(*) as total_proyectos
from public.proyectos, periodo
where created_at >= (periodo.desde::timestamp at time zone 'America/La_Paz')
  and created_at < ((periodo.hasta + interval '1 day')::timestamp at time zone 'America/La_Paz');

-- Actividad del periodo, con el cliente relacionado.
with periodo as (
  select date '2026-10-01' as desde, date '2026-10-31' as hasta
)
select
  proyectos.nombre as proyecto,
  proyectos.estado,
  proyectos.created_at,
  clientes.nombre as cliente
from public.proyectos
join public.clientes on clientes.id = proyectos.id_cliente
cross join periodo
where proyectos.created_at >= (periodo.desde::timestamp at time zone 'America/La_Paz')
  and proyectos.created_at < ((periodo.hasta + interval '1 day')::timestamp at time zone 'America/La_Paz')
order by proyectos.created_at desc;

-- Cantidad de proyectos por estado dentro del mismo periodo.
with periodo as (
  select date '2026-10-01' as desde, date '2026-10-31' as hasta
)
select estado, count(*) as cantidad_proyectos
from public.proyectos, periodo
where created_at >= (periodo.desde::timestamp at time zone 'America/La_Paz')
  and created_at < ((periodo.hasta + interval '1 day')::timestamp at time zone 'America/La_Paz')
group by estado
order by cantidad_proyectos desc, estado;
