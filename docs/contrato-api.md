# Contrato de la API — ISCGB

Relevado y actualizado el **04/10/2026** contra el código de `ISCGB_Backend`
(`main` en `c048908`, PR #25) y los contratos que consume el frontend. Backend
a cargo de Angel Silva.

Dirección base de desarrollo: `http://localhost:5231`

> Este documento describe la API **tal como está hoy**, no como debería
> estar. Los problemas detectados figuran al final.

## `POST /api/Auth/login`

✅ **Ruta verificada en el backend actual (commit `c048908`, PR #25):**
`AuthController.Login` tiene `[HttpPost("login")]`, por lo que el frontend
debe continuar usando `POST /api/Auth/login`. No cambiar la URL a
`POST /api/Auth`.

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
  "idUsuario": 1,
  "roles": [
    { "idRol": 3, "nombreRol": "Docente" }
  ],
  "afiliacion_Emergencia": "APROSS",
  "fecha_Nacimiento": "1990-05-14",
  "cuil": "20438803357",
  "genero": "Masculino",
  "esDirectorSuplente": false
}
```

Los roles vienen en el cuerpo de la respuesta, en `roles`. El claim del token
también contiene roles para autorización del backend, pero el frontend usa la
lista del cuerpo para construir la sesión.

Los últimos cinco campos llegaron con el PR #24. `RespuestaLogin` los tipa
(opcionales, por si el backend es anterior), pero **no** pasan a `Sesion`:
ninguna pantalla los usa todavía. `esDirectorSuplente` no da permisos de
Director; los permisos salen de `roles`.

**Devuelve también — 401** `"Debe configurar su contraseña por primera vez…"`
si la cuenta todavía no pasó por `/crear-password`.

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
  "role": "Docente",
  "nbf": 1787094079,
  "exp": 1787101279,
  "iat": 1787094079
}
```

- Algoritmo `HS256`.
- Dura **2 horas** (`exp - iat = 7200`).
- `role` es el **nombre del rol**, no su ID.
- Puede ser un valor único o un arreglo cuando el usuario tiene más de un rol.
- El frontend toma los roles y sus IDs desde `respuesta.roles`; no usa el claim
  para decidir el rol de la sesión.

> El contrato histórico de la colección de Postman quedó desactualizado. El
> `AuthController` actual emite un claim por cada rol:
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
> - El cuerpo del login incluye además
>   `"roles": [{ "idRol": 3, "nombreRol": "Docente" }]`. La ventaja es que
>   **ya no hace falta sacar el rol del token**: viene en la respuesta y con
>   su nombre.
>
> El frontend ya adapta esta respuesta en `AuthHttpService` y conserva la
> relación `idRol`/`nombreRol` en `Sesion.rolesConId`.

## `POST /api/Auth/crear-usuario-prueba`

```json
{ "dni": "43120234", "password": "Juan123" }
```

Devuelve `{ "message": "Usuario de prueba creado con éxito." }`.

Es un endpoint de testing. **No debe llegar a producción.**

## Gestión de usuarios

El Director puede crear, editar, desactivar y reactivar cuentas desde la
pantalla de edición de usuario. Desactivar no elimina el registro: es una
baja lógica que deja `estadoUsuario = false`. Reactivar vuelve a dejar la
cuenta disponible para iniciar sesión.

### `POST /api/UsuariosAdmin/alta`

Crea una cuenta nueva. Envía el `CargaUsuarioDto` completo y devuelve un
mensaje de confirmación. Este endpoint es distinto de la reactivación: para
una cuenta existente se usa `PUT /api/UsuariosAdmin/alta/{id}`.

Desde el PR #24 los roles van en una **lista**: `idsRoles: [1, 3]` (antes
`idRol: 3`). Vacía o ausente → `400 "Debe asignar al menos un rol al
usuario."`. El detalle campo por campo está en `contrato-alta-usuario.md`.

### `PUT /api/UsuariosAdmin/modificar/{id}`

Actualiza el perfil completo del usuario indicado. El frontend envía el mismo
`CargaUsuarioDto` que utiliza para el alta.

⚠️ **Reemplaza todos los roles**: borra los que la persona tenía y deja solo
los de `idsRoles`. Por eso "Editar Usuario" precarga todos los roles actuales
tildados.

### `PUT /api/UsuariosAdmin/baja/{id}`

Desactiva lógicamente la cuenta. No recibe body. La fila continúa disponible
en el listado de usuarios y muestra la acción para reactivarla.

### `PUT /api/UsuariosAdmin/alta/{id}`

Reactiva una cuenta previamente desactivada. No recibe body. La acción está
disponible desde la misma pantalla de edición cuando el usuario tiene
`estadoUsuario = false`.

> El frontend traduce los errores de estos endpoints a mensajes de gestión de
> usuarios y mantiene separados los métodos `darDeBaja()` y `reactivar()`.

## `GET /api/ProgramasMateria/contexto-docente/{idUsuario}`

Devuelve el docente y las materias que tiene asignadas. La pantalla
"Entregar programa" usa este endpoint para llenar el selector de materias.

```json
{
  "idDocente": 1,
  "materias": [
    {
      "idMateria": 3,
      "nombre": "…",
      "carrera": "…",
      "curso": "…",
      "idComision": 1,
      "nombreComision": "Comisión A"
    }
  ]
}
```

Devuelve `404` cuando el usuario no está registrado como docente.

La comisión identifica la cursada/horario de la asignación del docente y se
muestra en el selector del frontend. No se envía en `POST /api/ProgramasMateria`
porque el programa se guarda por docente y materia, no por comisión.

## `POST /api/ProgramasMateria`

Contrato vigente del controller `ProgramasMateriaController`, usado por el
frontend actual.

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

## Legajos: `POST /api/Legajos` y la entrega en papel

`SubirLegajoDto.PresentadoFisico` dice si la persona además entregó el papel
en Secretaría. Desde el 04/10/2026 el frontend lo manda así:

| Quién sube | Qué ve | `presentadoFisico` |
|---|---|---|
| Docente (o Director/Secretario que también es Docente) | Casilla "También entregué este documento en Secretaría" + recordatorio mientras no la tilde | Lo que tilde |
| Alumno | Solo el recordatorio rojo | Siempre `false` |

Quién ve la casilla lo decide `declaraEntregaEnPapel` (`core/legajos/entrega-en-papel.ts`).
Después no hay forma de cambiarlo: `AuditoriaLegajoDto` solo recibe
`estado` y `comentario`.

`GET /api/Legajos/usuario/{id}` devuelve además `auditor` (nombre de quien
revisó, o el texto `"Sin auditor asignado"`): Mis Documentos lo muestra como
"Revisado por X". `GET /api/Legajos/pendientes` devuelve `rutaArchivo`, que
antes se descartaba al mapear.

## Reconocimiento de saberes

`POST /api/ReconocimientoSaberes/solicitar` (multipart: `idMateria`,
`comentario`, `programaPdf`, `analiticoPdf`), con la materia elegida de
`GET /api/Asignaciones/materias-disponibles`. Contrato completo y el 🔴 bug
del claim `"id"` (siempre 401) en `contrato-reconocimiento-saberes.md`.

## Endpoints del backend que el frontend todavía no consume

Existen en `main` pero no tienen pantalla. Salvo los de reconocimiento de
saberes (`[Authorize(Roles = "Secretario")]`), ninguno tiene `[Authorize]`.

| Endpoint | Para qué serviría |
|---|---|
| `GET /api/Asignaciones/docentes-disponibles` → `{ data: [{ idDocente, nombreCompleto }] }` | Asignar materias a docentes (Dirección) |
| `GET /api/Asignaciones/comisiones-disponibles` → `{ data: [{ idComision, nombreComision }] }` | Ídem |
| `POST /api/Asignaciones/asignar` — `{ idDocente, idMateria, idComision }` | Ídem. 400 si ya está asignada en esa comisión |
| `POST /api/Asignaciones/cargar-materia` — `{ nombreMateria, carrera, curso }` → `{ message, idMateria }` | Alta de materias. 400 si el nombre se repite |
| `GET /api/Buscador/global?termino=xx` → `{ cantidad, data: [{ tipo, titulo, subtitulo, idReferencia }] }` | Buscador del encabezado. Busca personas (las etiqueta todas "Docente"), materias y justificativos |
| `GET /api/Justificativos/{idUsuario}/justificativos` → `{ nombreUsuario, data: [...] }` | Que el Docente vea el estado de SUS justificativos |
| `GET /api/Justificativos/todos` → `{ data: [...] }` | Historial completo de justificativos para Secretaría/Dirección |
| `GET /api/Legajos/aprobados` | Listado de documentos aprobados del instituto |
| `GET /api/Legajos/{idUsuario}/faltantes` | Faltantes calculados en el servidor. El front ya los calcula con `requeridos-por-rol`. ⚠️ Con legajo completo devuelve un objeto `{ message }` en vez de `[]` |
| `GET /api/ReconocimientoSaberes/recibirSolicitudReconocimiento` y siguientes | Bandeja de Secretaría para reconocimiento de saberes |

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
