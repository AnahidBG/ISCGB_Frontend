# Verificación entre el frontend y el backend

Revisado el **06/10/2026** contra el código de `ISCGB_Backend` (`main` en
`f856989`). La primera versión es del 27/08/2026.

Es una revisión estática: se leyó el código de los dos lados y se comparó
campo por campo. No reemplaza a probarlo; para eso está `como-probar.md`. Los
pendientes del backend, ordenados, están en `alineacion-sprint-2.md`.

## Lo que coincide

**Puerto y CORS.** `launchSettings.json` levanta en `http://localhost:5231`, lo
mismo que `URL_BASE_API` en `core/configuracion/api.ts`. `Program.cs` tiene la
política `PermitirAngular` para `http://localhost:4200` y la aplica.
`UseHttpsRedirection` está comentado, así que el `http://` del frontend no
rebota a `https://`.

**Los nombres del JSON.** `Program.cs` no configura `JsonSerializerOptions`,
así que vale el camelCase por defecto de ASP.NET Core. Es lo que más rompe en
silencio, y coincide, incluso en los casos raros del login:

| El backend escribe | Sale como |
| --- | --- |
| `DNI` | `dni` |
| `Estado_usuario` | `estado_usuario` |
| `Lugar_Nacimiento` | `lugar_Nacimiento` |
| `TelefonoEmergencia` | `telefonoEmergencia` |
| `Roles: [{ IdRol, NombreRol }]` | `roles: [{ idRol, nombreRol }]` |

En el otro sentido, ASP.NET Core ignora las mayúsculas al leer el cuerpo, así
que el `camelCase` del frontend entra bien en los DTO en `PascalCase`.

**Los 404 que no son errores.** Legajos por usuario, requeridos por rol y
Usuarios filtrados responden 404 cuando no hay resultados. El frontend los
trata como una lista vacía.

**Los archivos subidos.** `Program.cs` tiene `app.UseStaticFiles()`, así que
los PDF de `wwwroot/uploads/` se pueden abrir desde el navegador.

**El token.** El backend lo valida con `UseAuthentication` y el frontend lo
manda en cada pedido con `tokenInterceptor`.

## Lo que no coincide

`RUTAS_API.materiasDisponibles` apunta a `/api/Asignaciones/materias-disponibles`.
El backend unificó esos endpoints en `MateriasController`, y la ruta real es
`/api/Materias/materias-disponibles`. Hoy responde 404 y el desplegable de
materias del reconocimiento de saberes queda vacío. Se corrige en el frontend.

`RUTAS_API` tiene también `/api/Legajos/resumen-usuarios`, que el backend nunca
implementó. El frontend no la usa: Control de Legajos pide `resumen-estado` y
cuenta en el navegador.

## Los datos que tienen que estar cargados

Es el motivo más probable de que parezca que la conexión falla cuando está
bien.

`POST /api/Auth/login` arma los roles desde `Usuarios_roles`. Si la persona no
tiene filas ahí, el login devuelve 200 con `roles: []`. Para el frontend eso es
una sesión válida sin ningún rol: `roleGuard` no deja pasar a nadie sin rol y
la persona queda en `/inicio`, sin un mensaje que explique por qué.

El orden para cargar datos:

1. Los cuatro roles en `Roles` y los `tipos_documentos`. El backend los carga
   solo al arrancar.
2. Los usuarios.
3. `Usuarios_roles`, para vincular a cada usuario con su rol.
4. `roles_tipos_documentos`. Sin esto, `requeridos-por-rol` responde 404 y el
   progreso del legajo sale aproximado.

`POST /api/Auth/crear-usuario-prueba` crea el usuario con el rol 1 fijo, el
correo `prueba@test.com` y sin nombre ni apellido. El login devuelve
`usuario: " "` y el panel muestra el nombre vacío. Sirve para comprobar que el
login responde, no para probar pantallas.

## Reglas de negocio que el backend todavía no cumple

**Regla 1, validar el PDF por contenido.** Legajos no valida nada.
Justificativos mira el `ContentType`, que lo manda el navegador y se puede
falsear. Falta revisar los magic bytes (`%PDF-`).

**Regla 2, el renombrado.** Se cumple, con un timestamp agregado: legajos queda
como `ISCGB_{NombreApellido}_{TipoDoc}_{timestamp}.pdf` y justificativos como
`ISCGB_{NombreApellido}_Justificativo_{timestamp}.pdf`. Se hace en los
controllers, no en un servicio.

**Regla 4, el mail al rechazar.** `IEmailService` existe y manda los avisos de
documentación faltante, pero `AuditarLegajo` y `AuditarJustificativo` no lo
llaman.

**Regla 5, `[Authorize]`.** Lo tienen `UsuariosAdmin`, `Certificados`,
`ReconocimientoSaberes` y `mis-materias`. Faltan `Usuarios`, `Legajos`,
`Justificativos`, `ProgramasMateria` y `Configuracion`: cualquiera que sepa la
URL puede pedir el listado del instituto o el legajo de una persona sin token.
Un guard del lado del cliente no es seguridad, porque se saltea desde las
herramientas del navegador.

## Detalles para tener en cuenta

En justificativos, si `tipoInasistencia` es exactamente `"Causas Personales"`,
el PDF es opcional. Para cualquier otro valor es obligatorio. Ese texto tiene
que coincidir letra por letra desde el frontend, mayúsculas incluidas.

La carpeta de archivos se llama `wwwRoot`, con R mayúscula, y ASP.NET busca
`wwwroot`. En Windows da igual, pero en un servidor Linux no la va a encontrar.
Conviene renombrarla antes del despliegue.
