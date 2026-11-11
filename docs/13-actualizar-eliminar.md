# Guía 13 - Actualizar y eliminar registros

## Pruebas de funcionamiento

### 1. Editar un proyecto

Al hacer clic en el botón "Editar" de un proyecto, se abre el formulario con los datos precargados. Tras modificar algún dato y hacer clic en "Guardar cambios", el proyecto se actualiza en la base de datos de Supabase y la tabla se recarga automáticamente.

La interfaz se probó con una cuenta administradora temporal real: el cambio se guardó en Supabase y apareció en la tabla tras filtrar por el nuevo nombre.

### 2. Eliminar un proyecto

Al hacer clic en el botón "Eliminar", aparece un cuadro de diálogo (`window.confirm()`) preguntando si estamos seguros de eliminar. Al aceptar, se borra el proyecto en Supabase y desaparece de la pantalla.

La operación exige confirmación y comprueba que Supabase haya devuelto una fila eliminada. Se verificó el borrado desde la interfaz con una cuenta administradora temporal y se confirmó que la fila dejó de existir en la base.

## Reflexión Breve

**¿Qué pasaría si la línea `.update({ nombre, descripcion })` se ejecutara sin el `.eq("id", id)` al final?**

Sin `.eq("id", id)`, una operación podría afectar todas las filas autorizadas por las políticas RLS. Supabase no bloquea automáticamente las actualizaciones masivas: el filtro limita el objetivo de esta acción y las políticas limitan qué filas puede modificar cada usuario.
