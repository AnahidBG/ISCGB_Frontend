# Verificación frontend ↔ backend

Fecha: **27/08/2026** · Revisado contra el código fuente real de `ISCGB_Backend`
(no contra `docs/contrato-api.md`, que había quedado desactualizado).

Esto es una revisión **estática**: se leyó el código de los dos lados y se
comparó campo por campo. No se levantó el servidor ni se ejecutó nada — para
eso está la sección "Cómo probarlo a mano" al final, con el orden exacto.

---

## Resumen

| | Estado |
|---|---|
| Puerto, CORS, formato JSON | ✅ Todo alineado |
| Los 4 endpoints que el frontend consume | ✅ Coinciden campo por campo |
| Datos semilla en la base | ⚠️ **Bloqueante si faltan** — ver abajo |
| Archivos subidos (PDFs) | ❌ **No se pueden ver desde el navegador** |
| Seguridad (JWT, roles) | ❌ Sin validar del lado del servidor |
| Justificativos | ⚠️ El backend ya los tiene; el frontend no los consume |

---

## 1. Lo que está bien (verificado línea por línea)

**Puerto y CORS.** `launchSettings.json` levanta en `http://localhost:5231`,
que es exactamente lo que dice `URL_BASE_API` en `core/configuracion/api.ts`.
`Program.cs` tiene la política `PermitirAngular` para `http://localhost:4200`
y la aplica con `app.UseCors(...)`. `UseHttpsRedirection` está comentado, así
que el `http://` del frontend no rebota a `https://`. **Los dos hablan.**

**Formato de nombres (el que más rompe en silencio).** `Program.cs` no
configura `JsonSerializerOptions`, así que aplica el camelCase por defecto de
ASP.NET Core. Se verificó qué nombre sale para cada propiedad de las
respuestas anónimas de los controladores, y todas coinciden con lo que el
frontend espera — incluidos los casos raros del login:

| Backend escribe | Sale como | Frontend espera |
|---|---|---|
| `DNI` | `dni` | `dni` ✅ |
| `Estado_usuario` | `estado_usuario` | `estado_usuario` ✅ |
| `Lugar_Nacimiento` | `lugar_Nacimiento` | `lugar_Nacimiento` ✅ |
| `TelefonoEmergencia` | `telefonoEmergencia` | `telefonoEmergencia` ✅ |
| `Roles: [{IdRol, NombreRol}]` | `roles: [{idRol, nombreRol}]` | `RolApi` ✅ |

En sentido inverso (lo que el frontend manda), la deserialización de ASP.NET
Core ignora mayúsculas por defecto, así que nuestro `camelCase` entra sin
problema en los DTOs `PascalCase`. Vale para `LoginRequestDto` y para
`CrearProgramaDto`.

**Los 4 endpoints que el frontend consume hoy:**

| Frontend | Endpoint real | Estado |
|---|---|---|
| `AuthHttpService.iniciarSesion()` | `POST /api/Auth/login` | ✅ |
| `ProgramasMateriaHttpService.enviarPrograma()` | `POST /api/ProgramasMateria` | ✅ |
| `ProgramasMateriaHttpService.descargarPdf()` | `GET /api/ProgramasMateria/{id}/pdf` | ✅ |
| `LegajoHttpService.obtenerLegajoPropio()` | `GET /api/Legajos/usuario/{id}` | ✅ |
| `UsuariosHttpService.listar()` | `GET /api/Usuarios` | ✅ |

`ProgramaMateria` y `ContenidoUnidad` coinciden campo por campo con
`CrearProgramaDto` y `CrearContenidoDto`. Los dos endpoints que devuelven 404
cuando no hay resultados (Legajos por usuario, Usuarios filtrados) ya están
manejados como "lista vacía" y no como error.

**El backend compila, hasta donde se puede saber leyendo.** Todos los
`DbSet` que usan los controladores existen en `TuDbContext`
(`TiposDocumentos`, `RolesTiposDocumentos`, `ProgramasMateria`,
`Justificativos`...), y todas las propiedades que tocan existen en los
modelos. No se encontró ninguna referencia rota.

---

## 2. ⚠️ Lo primero a revisar si "no anda nada": los datos semilla

Este es, por lejos, el motivo más probable de que parezca que la conexión
falla cuando en realidad está bien.

`POST /api/Auth/login` arma los roles así:

```csharp
var listaRoles = usuario.UsuariosRoles.Select(ur => new {
    IdRol = ur.IdRol,
    NombreRol = ur.IdRolNavigation?.Rol
}).ToList();
```

Si la tabla `Roles` está vacía, o si el usuario no tiene filas en
`Usuarios_roles`, el login **devuelve 200 con `roles: []`**. Del lado del
frontend eso no es un error: es una sesión válida sin ningún rol. Y como
`roleGuard` no deja pasar a nadie sin rol, la persona entra y queda rebotada
en `/inicio`, sin ningún mensaje que explique por qué.

**Orden obligatorio para cargar datos** (es lo que decía tu nota "AGREGAR
ROLES PRIMERO ANTES DE CREAR USUARIO"):

1. `INSERT` en `Roles` — los cuatro: Director, Secretario, Docente, Alumno.
2. `INSERT` en `tipos_documentos`.
3. Recién ahí crear usuarios.
4. `INSERT` en `Usuarios_roles` para vincular cada usuario con su rol.
5. `INSERT` en `roles_tipos_documentos` (esto es lo que necesita
   `GET /api/Legajos/requeridos-por-rol/{idRol}`; sin esto devuelve 404).

⚠️ Ojo con `POST /api/Auth/crear-usuario-prueba`: crea el usuario con
`IdRol = 1` fijo, email `prueba@test.com` y **sin Nombre ni Apellido**. Eso
hace que el login devuelva `usuario: " "` y que en el panel se vea el nombre
vacío. Sirve para probar que el login responde, no para probar las pantallas.
Para eso conviene cargar un usuario a mano con nombre, apellido y su rol.

---

## 3. ❌ Los PDFs subidos no se pueden abrir desde el navegador

`Program.cs` **no tiene `app.UseStaticFiles()`**.

Los dos controladores que guardan archivos devuelven una ruta relativa
(`uploads/xxx.pdf` en Legajos, `/uploads/justificativos/xxx.pdf` en
Justificativos) y los archivos efectivamente se escriben en disco — se ven
en `wwwRoot/uploads/`. Pero sin `UseStaticFiles()`, ASP.NET no sirve esa
carpeta por HTTP: pedir `http://localhost:5231/uploads/loquesea.pdf` devuelve
404.

O sea: el Secretario nunca va a poder abrir el documento que tiene que
revisar. **La subida funciona, la lectura no.**

Es una línea en `Program.cs`, entre `UseCors` y `MapControllers`:

```csharp
app.UseCors("PermitirAngular");
app.UseStaticFiles();          // ← falta esto
app.MapControllers();
```

No lo toqué porque es el repo de Angel — conviene que lo agregue él o que le
pases este párrafo.

> Detalle menor asociado: la carpeta en disco se llama `wwwRoot` con R
> mayúscula, y ASP.NET busca `wwwroot`. En Windows da igual porque el sistema
> de archivos no distingue mayúsculas, pero el día que esto se despliegue en
> un servidor Linux va a dejar de encontrarla. Conviene renombrarla ahora.

---

## 4. ❌ Seguridad: los guards del frontend hoy no protegen nada

`Program.cs` no llama a `app.UseAuthentication()` ni a
`app.UseAuthorization()`, y **ningún controlador tiene `[Authorize]`**.

Consecuencia concreta: cualquiera que sepa la URL puede hacer
`GET http://localhost:5231/api/Usuarios` desde el navegador, sin token, y
recibir el listado completo del instituto. Lo mismo con los legajos de
cualquier persona.

Esto viola la regla de negocio #5 de `CLAUDE.md`, que pide `[Authorize(Roles
= "...")]` en el backend **y** `RoleGuard` en el frontend, justamente porque
un guard del lado del cliente no es seguridad: es comodidad. Cualquiera abre
las herramientas de desarrollo y lo saltea.

**Del lado del frontend hay un pendiente que se desprende de esto:** hoy no
mandamos el token en ninguna llamada (no hay interceptor de `Authorization`).
Está bien mientras el backend no lo valide, pero el día que Angel agregue
`[Authorize]`, **todas las pantallas van a empezar a dar 401 de golpe**. La
solución es un interceptor de dos líneas que agregue el header — el lugar
natural es al lado de `carga.interceptor.ts`. Te lo puedo dejar armado cuando
quieras; lo dejé afuera ahora para no agregar algo que todavía no hace nada.

---

## 5. ⚠️ Reglas de negocio del MVP que el backend todavía no cumple

Vale la pena pasárselas a Angel juntas, porque son las cuatro del mismo
documento:

| Regla (`CLAUDE.md`) | Estado |
|---|---|
| #1 · Validar PDF por contenido, no por extensión | ❌ `Legajos` no valida nada. `Justificativos` valida `ContentType`, que lo manda el cliente y se puede falsear. Falta chequear los *magic bytes* (`%PDF-`) |
| #2 · Renombrar a `ISCGB_NombreyApellido_NombreDocumento` | ⚠️ A medias: `Justificativos` **sí** lo hace (`ISCGB_AngelSilva_doc.pdf`, se ve en la carpeta). `Legajos` **no**: usa `{Guid}_{nombre original}` |
| #4 · Email automático al rechazar | ❌ Ni `AuditarLegajo` ni `AuditarJustificativo` disparan nada. No existe `IEmailService` en el proyecto |
| #5 · `[Authorize(Roles = ...)]` | ❌ Ver punto 4 |

La #2 es la más fácil de cerrar: la lógica ya está escrita en
`JustificativosController` (líneas 44-53), es copiarla a
`LegajosController.SubirDocumento`.

---

## 6. ⚠️ Justificativos: el backend ya está, el frontend no

Apareció `JustificativosController`, que no existía la última vez. Tiene tres
endpoints funcionando:

- `POST /api/Justificativos/cargar` (multipart) — con el renombrado correcto
- `PUT /api/Justificativos/auditar/{id}` — body `{idUsuarioAuditor, estado}`
- `GET /api/Justificativos/pendientes` — devuelve `[{idJustificativo,
  nombreDocente, tipoInasistencia, rutaArchivo, fechaCarga}]`

El frontend no consume ninguno todavía y no tiene pantalla de justificativos.
Está en Sprint 1 (`ISCGB-PROJECT.md` → "Recepción y validación de
justificación"), así que es candidato claro para lo próximo — sobre todo
`GET /pendientes`, que es exactamente lo que le falta al panel del Secretario
para dejar de mostrar datos inventados.

Un detalle del endpoint de carga: si `tipoInasistencia` es exactamente
`"Causas Personales"` el PDF es opcional; para cualquier otro valor es
obligatorio. Ese string tiene que coincidir **letra por letra** desde el
frontend, mayúsculas incluidas.

---

## 7. Cómo probarlo a mano (el orden importa)

Hay un archivo `pruebas-api.http` en la raíz del backend con todas estas
llamadas listas para ejecutar desde VS Code (extensión *REST Client*), o se
pueden hacer desde Swagger en `http://localhost:5231/swagger`.

**Antes de tocar Angular**, verificar que el backend solo funciona:

1. `dotnet run` en `ISCGB_Backend`. Tiene que decir
   `Now listening on: http://localhost:5231`.
   - Si falla la conexión a la base: revisar que SQL Server Express esté
     corriendo y que la base `Autogestion_Docente` exista
     (`appsettings.json` → `DefaultConnection`).
2. Abrir `http://localhost:5231/swagger`. Si carga, la API está viva.
3. `POST /api/Auth/login` con un DNI y contraseña reales.
   - **Mirar el campo `roles` de la respuesta.** Si viene `[]`, el problema
     son los datos semilla (punto 2), no el código.
4. `GET /api/Usuarios` — tiene que devolver `{paginacion, datos}`.
   - 404 significa "no hay usuarios que cumplan el filtro", no un error.
5. `GET /api/Legajos/usuario/1` — array, o 404 si esa persona no tiene
   documentos cargados.

**Recién ahí, el frontend:**

6. `ng serve` en `ISCGB_Frontend`, entrar a `http://localhost:4200/login`.
7. Iniciar sesión con el mismo DNI del paso 3. Tenés que caer en el panel
   que corresponde al rol (Director → `/director/panel`, etc.).
   - Si caés en `/inicio`, la sesión no trae roles → volver al paso 3.
8. En el panel del Director, la tabla tiene que mostrar los usuarios reales.
   La columna de estado de legajo va a estar vacía en todas las filas: eso es
   correcto y esperado, `GET /api/Usuarios` no trae ese dato todavía (está
   explicado en `docs/alcance-dashboard-director.md`).
9. Abrir la consola del navegador (F12 → Network). Si ves errores de CORS,
   revisar que el backend esté en el 5231 y el frontend en el 4200 exactos —
   la política está atada a esos puertos.
10. Mientras carga, tiene que verse el logo animado: eso confirma que
    `cargaInterceptor` está enganchado.

---

## Pendientes para pasarle al equipo de backend

1. `app.UseStaticFiles()` — sin esto ningún PDF subido se puede abrir (punto 3).
2. Renombrar la carpeta `wwwRoot` → `wwwroot` (punto 3).
3. `UseAuthentication()` / `UseAuthorization()` + `[Authorize(Roles = ...)]`
   en los endpoints privados (punto 4).
4. Validar PDF por magic bytes en `Legajos` (regla #1).
5. Copiar el renombrado `ISCGB_...` de Justificativos a Legajos (regla #2).
6. Enganchar el email automático al rechazar (regla #4).
7. Agregar el estado de legajo agregado por persona a `GET /api/Usuarios`, o
   un endpoint nuevo — es lo único que le falta al panel del Director.
8. Un endpoint de legajos pendientes de revisión de **todo** el instituto
   (hoy solo se puede pedir por usuario) — es lo único que le falta al panel
   del Secretario.
