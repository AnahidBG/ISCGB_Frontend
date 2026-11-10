# Verificación entre el frontend y el backend

Revisado el **06/10/2026** contra el código de `ISCGB_Backend` (`main` en
`f856989`). La primera versión es del 27/08/2026. Las reglas de negocio y los
datos de prueba se volvieron a revisar el **10/11/2026**, con los cambios de
seguridad del back (`523d05b` y `dbb76fa`, `main` en `e26afd8`).

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

`RUTAS_API` tiene `/api/Legajos/resumen-usuarios`, que el backend nunca
implementó. El frontend no la usa: Control de Legajos pide `resumen-estado` y
cuenta en el navegador.

El 06/10/2026 se corrigió `RUTAS_API.materiasDisponibles`, que apuntaba a
`/api/Asignaciones/materias-disponibles`. El backend había unificado esos
endpoints en `MateriasController` y la ruta respondía 404, así que el
desplegable de materias del reconocimiento de saberes quedaba vacío. Ese
desplegable ya no usa esa ruta: desde el 05/10/2026 pide `mis-materias`, y
`materias-disponibles` quedó para "Materias y asignaciones".

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
5. `alumno_materia`, para cada alumno que tenga que pedir un reconocimiento de
   saberes. Sin esto, `mis-materias` devuelve una lista vacía y el alumno no
   puede elegir materia. Ningún endpoint las crea: van con un `INSERT` a mano.

`POST /api/Auth/crear-usuario-prueba` ya no existe: el back lo borró en
`523d05b`. Un usuario se crea con el alta de Dirección (`UsuariosAdmin/alta`),
que manda el mail para elegir la contraseña, o con los scripts de la base.

Los tipos de documento y lo que se le pide a cada rol ya no se cargan a mano:
`DbSeeder` los sincroniza en cada arranque con su lista (`dbb76fa`). Al
Docente le pide DNI, Curriculum Vitae, Título profesional, Apto médico, Apto
psicológico, Ley 9680 y Certificado de domicilio; al Alumno, DNI, Analítico
del secundario, Partida de nacimiento, Antecedentes penales, Apto médico y
Apto psicológico. Todos son obligatorios, y los aptos, la Ley 9680 y el
certificado de domicilio son anuales. El DNI pasó a ser un solo archivo ("DNI
FRENTE" se renombró a "DNI" y "DNI DORSO" se borra si nadie lo subió).

## Reglas de negocio que el backend todavía no cumple

**Regla 1, validar el PDF por contenido.** Desde `523d05b` se cumple:
`Seguridad/ValidadorArchivos.cs` revisa la extensión, el tamaño (hasta 10 MB)
y los primeros bytes en legajos, justificativos, reconocimiento de saberes y
contratos. Lo que falta es que legajos acepta también JPG y PNG, y la regla
pide solo PDF. El frontend manda solo PDF.

**Regla 2, el renombrado.** Se cumple, con un timestamp y un código aleatorio
agregados: legajos queda como
`ISCGB_{NombreApellido}_{TipoDoc}_{timestamp}_{código}.pdf` y justificativos
como `ISCGB_{NombreApellido}_Justificativo_{timestamp}_{código}.pdf`. El
código hace que la URL de `/uploads`, que se sirve sin token, no se pueda
adivinar. Se hace en los controllers, no en un servicio.

**Regla 4, el mail al rechazar.** `IEmailService` existe y manda los avisos de
documentación faltante, pero `AuditarLegajo` y `AuditarJustificativo` no lo
llaman.

**Regla 5, `[Authorize]`.** Desde `523d05b` se cumple: `Program.cs` tiene una
`FallbackPolicy` que pide sesión en todo endpoint, salvo los marcados
`[AllowAnonymous]` (login, recupero, `establecer-password` y `Ubicaciones`).
Lo de todo el instituto pide Director o Secretario, y lo de una persona lo
puede pedir ella misma o Dirección y Secretaría (`UsuarioActual.PuedeAccederA`);
con otro id responde 403. Lo que sigue sin cumplirse es que nadie apruebe sus
propios documentos: el back no lo controla.

**Fuerza bruta.** Login, recupero y `establecer-password` admiten 10 pedidos
por minuto por IP; después responden 429 sin body. El frontend lo muestra como
"Hiciste demasiados intentos seguidos".

## Detalles para tener en cuenta

En justificativos, si `tipoInasistencia` es exactamente `"Causas Personales"`,
el PDF es opcional. Para cualquier otro valor es obligatorio. Ese texto tiene
que coincidir letra por letra desde el frontend, mayúsculas incluidas.

La carpeta de archivos se llama `wwwRoot`, con R mayúscula, y ASP.NET busca
`wwwroot`. En Windows da igual, pero en un servidor Linux no la va a encontrar.
Conviene renombrarla antes del despliegue.
