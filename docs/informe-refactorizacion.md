# Estado de la refactorización de NOCTUA

## Implementado localmente

- Diseño claro monocromático y eliminación del selector y lógica de temas.
- Módulos separados de acceso a datos, validación, interfaz, clientes y administración; administración y solicitudes de cliente cargadas bajo demanda.
- Panel lateral: proyectos, categorías, usuarios/clientes, solicitudes y mensajes. Búsqueda, ordenamiento y paginación en servidor, detalles, formularios, confirmación de borrado y comprobación de filas afectadas.
- Proyectos: cliente, categoría, estado, descripción, publicación y enlaces reales HTTP/HTTPS. Conserva CRUD y estados originales.
- Perfil propio editable, recuperación por correo y mensaje genérico de credenciales incorrectas. Los formularios bloquean doble envío.
- Indicadores con COUNT exacto en servidor; informe por periodo muestra hasta 50 detalles y avisa del límite, sin truncar los totales.
- Versiones fijas, lockfile, compilación, lint y pruebas.

## Auditoría y restricciones

Se confirmó RLS en las seis tablas existentes. La migración restrictiva se aplicó el 3 de noviembre de 2026 y quedó registrada en el historial remoto. Se verificó con sesiones reales que una solicitud no puede asociarse a un proyecto ajeno y que el administrador no puede modificar su propio rol. Los datos temporales de prueba se eliminaron.

Servicios y paquetes como catálogo administrable, archivo/avance porcentual, estados de cuentas, creación administrativa de usuarios, auditoría persistente y configuración operativa NO están implementados. Son ampliaciones del prompt maestro posteriores al alcance de las guías 1–16; se retiraron sus entradas administrativas para que el menú muestre solo módulos existentes. La sección pública de servicios es informativa. La edición de roles usa las políticas actuales y debe endurecerse en servidor con la migración y protección del último administrador.

El bloqueo tras tres intentos NO está activo ni implementado. Supabase Password Verification Attempt Hook requiere Teams/Enterprise según documentación consultada; el proyecto original requiere plan gratuito. Un contador en navegador o proxy evitable no cumpliría el requisito. Hace falta decidir una infraestructura compatible, implementar el hook transaccional y probarlo antes de anunciar esa protección. No se cambió el plan.

## Verificaciones y rendimiento

`npm run lint`, cuatro pruebas unitarias y compilación de producción ejecutados. Dos pruebas de navegador aprobadas: visitante (cinco anchos 320/390/768/1024/1440, acceso privado oculto, búsqueda y mensaje de login) y administración (navegación, tabla de proyectos, formulario y selector de cliente, ancho móvil). Respuestas de prueba aisladas, sin crear registros reales. No equivalen a pruebas de RLS, CRUD persistido ni Auth de producción.

El sistema visual cubre más componentes que la versión anterior, por lo que no se afirma una reducción de CSS. El bundle separa administración y cliente del arranque. No se midieron Lighthouse, LCP, INP ni CLS en producción; no se atribuyen mejoras de esos indicadores.

## Archivos

Modificados: index.html, css/styles.css, js/app.js, js/supabase-client.js y las tres páginas de pages/ antes vacías.

Nuevos: js/ui.js, js/data.js, js/validation.js, js/admin.js, js/client.js, package.json, package-lock.json, .gitignore, eslint.config.js, playwright.config.js, scripts/build.mjs, scripts/dev.mjs, tests/, docs/plan-refactorizacion.md, este informe y supabase/migrations/20261029203525_harden_existing_permissions.sql.

Eliminados: assets/supabase-client.js (vacío) y script.js (ejercicios comentados desconectados). Recuperables en el respaldo ZIP y en Git. Se conservaron logos y guías históricas.

## Ejecutar y desplegar

Node.js 22 o posterior. `npm ci`, `npm run dev`, abrir http://127.0.0.1:4173. El servidor compila al arrancar; reiniciar tras editar. `npm run build` genera dist/, única carpeta que se publica. No abrir el HTML directamente sin compilar. `npm run test:e2e` requiere Chrome y servidor activo.

Configurar en Supabase Site URL y Redirect URLs para el dominio real y desarrollo local, necesarios en recuperación de contraseña. No colocar claves administrativas en JavaScript. La clave existente es pública.

## Pendiente para completar el prompt maestro

Quedan fuera del alcance de las guías 1–16 la protección transaccional del último administrador, backend administrativo de cuentas, tablas y CRUD de catálogo, auditoría, estados/archivo/avances y medición de rendimiento en producción. La recuperación por correo aún requiere validación con una bandeja real. Esta entrega no cubre el prompt maestro completo.

Respaldo: noctua-antes-refactor-20261029.zip en la carpeta de visualizaciones de esta conversación. Incluye cambios previos sin commit. La reversión del frontend se realiza desde ese ZIP; no requiere borrar datos de la base.
