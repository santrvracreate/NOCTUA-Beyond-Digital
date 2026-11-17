-- El filtro público necesita leer solo el identificador de categoría.
-- La política RLS de proyectos sigue limitando las filas a los publicados.
grant select (id_categoria) on public.proyectos to anon;
