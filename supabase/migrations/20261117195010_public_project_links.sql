-- Los visitantes pueden abrir únicamente enlaces de proyectos publicados;
-- la política de filas de proyectos mantiene ocultos los demás registros.
grant select (url_produccion) on public.proyectos to anon;
