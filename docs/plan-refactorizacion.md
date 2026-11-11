# Refactorización NOCTUA — 29 de octubre de 2026

## Auditoría previa y alcance adaptado

Se conserva HTML/CSS/JavaScript y Supabase, los roles `admin` y `usuario`, los UUID compartidos por Auth/perfiles/clientes, las URLs y los estados de proyectos. No se sustituye la aplicación por otro framework. El prompt nuevo establece diseño claro monocromático, reemplazando la propuesta anterior de dos temas.

Esquema confirmado en la instancia `sistem-portafoleo`: categorias, clientes, perfiles, proyectos, solicitudes y mensajes. No existen servicios ni paquetes: se crearán únicamente como ampliación explícita del prompt, con tablas de relación y RLS. No se inventarán registros comerciales.

Hallazgos: JS monolítico; SDK CDN sin versión fija; consultas sin paginación; indicadores calculados sobre filas potencialmente truncadas; refrescos redundantes de Auth; errores de red y mutaciones sin manejo homogéneo; páginas antiguas vacías; scripts académicos desconectados; faltan gestión de perfiles/catálogo/solicitudes y APIs administrativas de Auth. Las políticas existentes se auditan antes de modificarse.

## Orden de implementación y dependencias

1. Respaldo completo de los archivos actuales, incluyendo cambios sin commit, en `noctua-antes-refactor-20261029.zip` en la carpeta de visualizaciones de esta conversación. Conservar esquema/políticas previas antes de las migraciones.
2. Añadir herramientas de compilación, lint y pruebas con versiones fijas; medir la versión previa desde el respaldo.
3. Separar utilidades, validación, acceso a datos, autenticación, portafolio y administración. Los módulos de gestión se cargan al iniciar sesión.
4. Diseño claro monocromático, navegación lateral administrativa, formularios accesibles, tablas y paginación. Preservar IDs hasta migrar sus consumidores.
5. Migración aditiva y compatible: índices, permisos, auditoría, estado de cuenta, archivo/avance de proyectos y catálogo. Revisar SQL antes de aplicar; ninguna eliminación de registros de producción.
6. Operaciones de usuarios mediante Edge Function autenticada; ninguna clave administrativa en frontend. Política de cuentas inactivas aplicada también en RLS para sesiones existentes.
7. Pruebas unitarias, navegador con fixtures aisladas, consultas de permisos en transacciones revertidas, compilación final y comparación de mediciones.

## Restricción de autenticación conocida

El requisito original del curso usa Supabase gratuito. Password Verification Attempt Hook requiere Teams/Enterprise según documentación actual. Un proxy Edge con contador no impide llamadas directas a Auth. El límite de tres fallos se prepara como hook real con almacenamiento privado, transacciones y expiración, y no se declarará activo hasta habilitarlo en un plan compatible y verificar el flujo real. No se cambiará el plan ni se contratarán servicios automáticamente.

## Reversión

El ZIP conserva fuentes y logos. Los cambios de base serán aditivos; restaurar código anterior no exige borrar las tablas nuevas. Desactivar un hook se realiza desde Auth Hooks antes de revertir sus funciones. No eliminar datos nuevos como parte de una reversión de interfaz.
