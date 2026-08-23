# Contrato de la API — ISCGB

Relevado el **19/08/2026** de la colección de Postman publicada por el QA
del equipo. Backend a cargo de Angel Silva.

Dirección base de desarrollo: `http://localhost:5231`

> Este documento describe la API **tal como está hoy**, no como debería
> estar. Los problemas detectados figuran al final.

## `POST /api/Auth/login`

Autentica **por DNI**, no por email.

**Envía**

```json
{
  "dni": "43880335",
  "password": "Test1234"
}
```

El `dni` va sin puntos.

**Devuelve — 200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": " ",
  "estado_usuario": true,
  "dni": "43880335",
  "telefono": null,
  "telefonoEmergencia": null,
  "lugar_Nacimiento": null,
  "nombreContactoEmergencia": null,
  "direccion": null,
  "email": "prueba@test.com",
  "idUsuario": 1
}
```

⚠️ **El rol no viene acá.** Viaja dentro del `token`.

⚠️ Los nombres mezclan convenciones: `telefonoEmergencia` (camelCase),
`estado_usuario` (snake_case) y `lugar_Nacimiento`. El frontend los replica
tal cual en `RespuestaLogin` y los ordena una sola vez al convertirlos a
`Sesion`.

**Devuelve — 401 Unauthorized**

```json
{ "message": "Contraseña incorrecta." }
{ "message": "DNI no encontrado o cuenta inactiva." }
```

## El token JWT

```json
{
  "nameid": "1",
  "DNI": "43880335",
  "role": "1",
  "nbf": 1787094079,
  "exp": 1787101279,
  "iat": 1787094079
}
```

- Algoritmo `HS256`.
- Dura **2 horas** (`exp - iat = 7200`).
- `role` es el **ID del rol en texto**, no su nombre.
- `role` es **uno solo**, aunque la base permite varios por usuario.

> 🔺 **Desactualizado.** Lo de arriba es lo que devolvía la API el 19/08. El
> `AuthController` que está hoy en el repositorio ya no se comporta así:
>
> ```csharp
> foreach (var rol in usuario.UsuariosRoles)
>     claims.Add(new Claim(ClaimTypes.Role, rol.IdRolNavigation.Rol));
> ```
>
> - `role` ahora trae el **nombre** del rol (`"Docente"`), no el ID.
> - Es un `foreach`: puede emitir **varios**. Cuando hay más de uno, el JWT
>   los serializa como **arreglo**, así que `payload.role` puede llegar como
>   `string` o como `string[]`. `JwtPayload` lo tipa como `string` a secas y
>   `AuthHttpService` lo asigna a `idRol` sin revisar — hay que corregirlo.
> - El cuerpo del login ahora incluye además
>   `"roles": [{ "idRol": 1, "nombreRol": "Docente" }]`, que `RespuestaLogin`
>   todavía no declara. La ventaja es que **ya no hace falta sacar el rol del
>   token**: viene en la respuesta y con su nombre, lo que resuelve el
>   problema #3 de la tabla de abajo.
>
> Pendiente: confirmarlo contra la API corriendo antes de tocar el frontend.

## `POST /api/Auth/crear-usuario-prueba`

```json
{ "dni": "43120234", "password": "Juan123" }
```

Devuelve `{ "message": "Usuario de prueba creado con éxito." }`.

Es un endpoint de testing. **No debe llegar a producción.**

## `POST /api/ProgramasMateria`

Relevado del **PR #4** del repositorio del backend (rama `programaMateria`),
no de haberlo probado corriendo. Al momento de escribir esto el PR figura
**cerrado sin mergear**: el código no está en `main`.

Guarda el programa junto con sus unidades de contenido en un solo pedido.

**Envía** — el `CrearProgramaDto`, con `contenidos` anidado:

```json
{
  "idDocente": 1,
  "idMateria": 3,
  "condicion": "Cuatrimestral",
  "fundamentacion": "…",
  "objetivosGenerales": "…",
  "objetivosEspecificos": "…",
  "horasSemanales": "4",
  "horasCuatrimestrales": "64",
  "formatoCurricular": "Materia teórico-práctica",
  "cicloLectivo": "2026",
  "evaluacion": "…",
  "criteriosEvaluacion": "…",
  "estrategiasMetodologicas": "…",
  "estrategiasAcompanamientoVirtualRemoto": "…",
  "condicionRegular": "…",
  "condicionPromocional": "…",
  "condicionLibre": "…",
  "examenesVirtuales": "…",
  "contenidos": [
    {
      "unidad": 1,
      "tituloUnidad": "…",
      "contenido": "…",
      "bibliografiaObligatoria": "…",
      "bibliografiaComplementaria": "…"
    }
  ]
}
```

Los nombres del DTO están en `PascalCase`, pero ASP.NET Core deserializa
JSON sin distinguir mayúsculas, así que el `camelCase` del frontend entra
bien. No hace falta traducir.

**Devuelve — 200 OK**

```json
{ "message": "Programa y contenidos guardados con éxito.", "idPrograma": 12 }
```

⚠️ Ese `idPrograma` es la única forma de pedir el PDF después. Si se
descarta, el usuario se queda sin manera de bajarlo.

**Devuelve — 404 Not Found** si el docente o la materia no existen:

```json
{ "message": "El docente especificado no existe." }
{ "message": "La materia especificada no existe." }
```

⚠️ Devuelve `200`, no `201`, y no expone la ubicación del recurso creado.

## `GET /api/ProgramasMateria/{idPrograma}/pdf`

Genera el PDF del programa con QuestPDF y lo devuelve como archivo.

**Devuelve — 200 OK**, `Content-Type: application/pdf`, adjunto con nombre
`Programa_Materia_{idMateria}.pdf`.

⚠️ **No es JSON.** El `HttpClient` de Angular necesita `responseType: 'blob'`
o intenta parsear los bytes del archivo y falla siempre.

⚠️ El nombre del archivo usa el **id de la materia**, no el del programa. Dos
programas distintos de la misma materia se bajan con el mismo nombre y el
segundo pisa al primero en la carpeta de descargas.

**Devuelve — 404 Not Found** con cuerpo vacío si el programa no existe.

El PDF arma las secciones 1 (Fundamentación), 2.1 (Objetivos generales),
3 (Contenidos) y 4 (Estrategias metodológicas). El resto de los campos que
recibe el `POST` se guardan pero **todavía no se imprimen**.

## Problemas detectados

| # | Problema | Gravedad |
|---|---|---|
| 0 | No hay CORS configurado en `Program.cs`: el navegador bloquea todas las llamadas desde `http://localhost:4200`. Con Postman funciona, desde Angular no. | 🔴 Bloqueante |
| 0b | Faltan `UseAuthentication()` y `UseAuthorization()`: el JWT se emite pero nunca se valida | 🔴 Alta |
| 0c | Los endpoints de programas no tienen `[Authorize]`, y `DescargarPdf` no verifica que quien pide sea el docente dueño: cambiando el número en la URL se baja el programa de cualquier otro | 🔴 Alta |
| 1 | `crear-usuario-prueba` crea usuarios sin autenticación | 🔴 Alta |
| 2 | Los 401 distinguen DNI inexistente de contraseña incorrecta, permitiendo averiguar qué DNIs existen | 🔴 Alta |
| 3 | `role` es un ID sin tabla de equivalencias publicada | 🟠 Bloquea el redirect por rol |
| 4 | `role` singular vs. `Usuarios_roles` muchos-a-muchos | 🟠 Contradicción de modelo |
| 5 | `dni` es `varchar(20)`: acepta `"Lucas23"` | 🟡 Media |
| 6 | `GET /weatherforecast` de la plantilla sigue expuesto | 🟡 Baja |
| 7 | Nombres de campos con convenciones mezcladas | 🟡 Baja |

## La base de datos vs. el documento del MVP

Base: `Autogestion_Docente` (SQL Server Express).

| El documento dice | La base dice |
|---|---|
| Entidad `Documento` | No existe: cada fila de `legajo` es un documento |
| `EstadoDocumento` es un enum | `estado` es `varchar(50) NULL` |
| Docente tiene CUIL | No existe el campo |
| Alumno tiene número de legajo | Tiene `cohorte` y `estado_academico` |

⚠️ Que `estado` sea texto libre y anulable significa que **el frontend no
puede dar por hecho** que va a recibir solo Pendiente / Aprobado / Rechazado.
El componente de badge tiene que contemplar un caso desconocido.

### Un regalo de la base

```sql
roles_tipos_documentos (id_rol, id_tipo_doc, obligatorio, anual)
```

Esta tabla es el denominador de la barra de progreso del Módulo de Salida:

```
progreso = documentos aprobados del usuario / documentos obligatorios de su rol
```
