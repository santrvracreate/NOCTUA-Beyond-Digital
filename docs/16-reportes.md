# Indicadores de proyectos

## Panel administrativo de NOCTUA

La entidad central del portafolio es `proyectos`. El panel administrativo permite conocer la actividad del portafolio sin exponer información privada a visitantes o clientes. Incluye:

- selector de fechas desde/hasta;
- total de proyectos creados en el periodo;
- cantidad en progreso, completada y publicada;
- listado de proyectos con nombre del cliente, estado y fecha;
- conteo de proyectos por estado.

El panel vive dentro del área administrativa. No se muestra a visitantes ni a clientes, porque relaciona proyectos con los datos de sus clientes.

## Consulta segura en la aplicación

La función `loadProjectSummary()` de `js/app.js` consulta proyectos y su cliente en una sola solicitud:

```javascript
supabaseClient.from('proyectos')
  .select('id,nombre,estado,visible_clientes,created_at,clientes(nombre)')
  .gte('created_at', localDayStartAsIso(desde))
  .lt('created_at', localDayStartAsIso(hasta, 1))
  .order('created_at', { ascending: false });
```

El select anidado `clientes(nombre)` trae el nombre de la persona asociada por `proyectos.id_cliente`, además de los datos del proyecto. Un `select()` simple no contendría esa relación, de modo que la interfaz no podría presentar el proyecto junto a su cliente sin hacer otra consulta.

El total se calcula en JavaScript con `data.length`; el desglose por estado usa `reduce()` con un objeto acumulador. La métrica de publicaciones exige a la vez `visible_clientes = true` y estado `completado`, que es la regla real del portafolio. El SQL equivalente está en `docs/sql/16-reportes.sql` y utiliza `COUNT()` y `GROUP BY`.

## Comparación y verificación

Para verificar el reporte, se debe consultar el mismo rango de fechas en la pantalla y en el SQL Editor. El valor de `total_proyectos` debe coincidir con el total mostrado en pantalla; cada total por estado debe coincidir con el resultado de `GROUP BY`.

| Verificación | Estado |
| --- | --- |
| Interfaz con filtro y total | Implementada localmente. |
| SQL de total, detalle y agrupación | Preparado en `docs/sql/16-reportes.sql`. |
| Consulta SQL de prueba | La base actual no contiene proyectos; las consultas devuelven `0` filas sin error. |
| Agrupación SQL de prueba | Sin proyectos en el periodo, el agrupamiento no devuelve filas. |

La prueba SQL confirma que las consultas funcionan también con una base vacía. Al registrar proyectos reales, abre la aplicación con la sesión administradora, consulta el mismo rango y verifica que los indicadores coincidan con el SQL.

## Buenas prácticas aplicadas

- El filtro usa el inicio local del día siguiente como límite superior exclusivo, por lo que incluye el día final completo sin depender de `23:59:59.999`. El SQL usa `America/La_Paz` para coincidir con la operación del portafolio.
- El reporte no usa una clave de servicio ni evita RLS: la consulta se ejecuta con la sesión del administrador y depende de sus políticas de acceso.
- Se valida que ambas fechas existan y que la inicial no sea mayor que la final antes de consultar.
