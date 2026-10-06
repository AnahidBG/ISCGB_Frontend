# Alcance del panel del Director

Analizado el 26/08/2026, en el Sprint 1, y actualizado el **06/10/2026**.
Aplica al panel del Director las tres preguntas de `docs/alcance-login.md`:
si está en un sprint, si existe el endpoint y si existe el dato en la base.

## Qué se construyó

El panel lista a todas las personas del instituto con su rol y el estado
general de su legajo, y arriba muestra los totales por estado.

Las personas salen de `GET /api/Usuarios` y los documentos de
`GET /api/Legajos/resumen-estado`. El backend no devuelve el estado del legajo
por persona, así que el frontend cruza las dos respuestas y lo calcula con
`estadoGeneralDelLegajo`. Quien no tiene ningún documento queda sin estado, y
`insignia-estado` lo muestra como "Sin estado" en vez de inventar un color.

Desde el panel se llega a "Nuevo Usuario" y a la edición de cada persona. Ese
alcance está en `docs/contrato-alta-usuario.md`.

## Por qué se arrancó con datos falsos

Cuando se analizó no había endpoints, pero el panel sí estaba en el roadmap.
Por eso no se archivó, como "Solicitar acceso" en el login: se maquetó con
`UsuariosMockService` para no frenar el frontend por un backend en
construcción. El 27/08 apareció `UsuariosController` y se pasó a datos reales.

El mock sigue en el repo. Para volver a datos de mentira alcanza con cambiar en
`app.config.ts` la clase que provee `UsuariosService`.

## Varios roles en una misma sesión

Una sesión con el rol Director entra a `/director/panel`, tenga los otros roles
que tenga. No se construyeron dos paneles ni una fusión de dashboards: se toma
el rol de mayor alcance como pantalla base y se le suman los accesos que
habilitan los demás. Si además es Docente, el menú agrega "Entregar programa de
materia".

El orden es Director, Secretario, Docente y Alumno, y lo resuelve
`destinoSegunRoles`. Si aparece un caso de dos roles sin jerarquía clara, como
Secretario y Alumno, hay que revisar la decisión y no dar por bueno el mismo
criterio.

Para probarlo está el usuario simulado `55555555`, "Dora Directora y Docente".

## Recuperar contraseña

`features/recuperar-contrasena/` es una pantalla pública, sin `authGuard`, que
simula el envío con un `setTimeout` y no manda ningún correo. Se lo dice a
quien la usa. El enlace del login pasó de un botón deshabilitado a un enlace a
`/recuperar-contrasena`.

## Lo que hay que saber

`GET /api/Usuarios` pagina de a 10. `UsuariosHttpService` pide
`registrosPorPagina=500` para traer todo el instituto de una vez. **Si el
instituto supera los 500 usuarios, el listado queda incompleto sin avisar.** La
solución es paginar en el panel, no subir ese número.

## Pendientes del backend

1. Que `GET /api/Usuarios`, o un endpoint nuevo, devuelva el estado del legajo
   por persona. Hoy el frontend trae el legajo de todo el instituto para
   calcularlo.
2. El endpoint de recuperación de contraseña, del Sprint 3. La base ya tiene
   `Usuarios.token_recuperacion` y `expiracion_token`.
