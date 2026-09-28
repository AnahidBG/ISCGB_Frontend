# Contrato: gestión de usuarios (alta, modificación y baja)

> **Sprint 2** — SCRUM-16 "Gestión de usuarios y roles (Dirección)"
> Subtareas: SCRUM-130 (frontend, Milena) · SCRUM-131 (backend, Angel)
> **Actualizado:** 28/09/2026

Este documento reemplaza la propuesta anterior (`POST /api/Usuarios`, del
27/08/2026), que el backend nunca implementó. El backend publicó **otro
contrato** y el frontend se alineó a ese.

## Dónde está

`Controllers/CargaUsuarioController.cs` en la rama **`CargaDeUsuarios`** de
ISCGB_Backend (commit `d455a51`, 27/09/2026). **Todavía no está en `main`.**

La clase se llama `UsuariosAdminController`, así que la ruta es
`api/UsuariosAdmin` (no `api/CargaUsuario`).

Contra un backend sin esa rama, las tres rutas responden 404 sin cuerpo y la
pantalla muestra: *"El servidor todavía no tiene habilitada la gestión de
usuarios…"*.

## Endpoints que consume el frontend

| Acción | Método y ruta | Cuerpo | Respuesta OK |
|---|---|---|---|
| Listado | `GET /api/Usuarios?pagina=1&registrosPorPagina=500` | — | `{ paginacion, datos[] }` (404 = vacío) |
| Detalle | `GET /api/Usuarios/{id}` | — | `UsuarioDetalle` |
| Alta | `POST /api/UsuariosAdmin/alta` | `CargaUsuarioDto` | `{ mensaje, legajoAutocompletado }` |
| Modificación | `PUT /api/UsuariosAdmin/modificar/{id}` | `CargaUsuarioDto` | `{ message }` |
| Baja | `PUT /api/UsuariosAdmin/baja/{id}` | — | `{ message }` |

### `CargaUsuarioDto` (lo que manda el frontend)

```json
{
  "nombre": "María",
  "apellido": "Gómez",
  "dni": "12345678",
  "cuil": "27123456780",
  "email": "maria@ejemplo.com",
  "genero": "Femenino",
  "direccion": "Av. Siempreviva 742",
  "telefono": "3511234567",
  "idProvincia": 6,
  "fechaNac": "1990-05-14",
  "contactoEmergencia": "Juan Gómez",
  "telefonoEmergencia": "3517654321",
  "afiliacionEmergencia": "APROSS",
  "idRol": 3,
  "esDirectorSuplente": true
}
```

- `dni` y `cuil` viajan **solo con dígitos**.
- `idRol`: 1 Director, 2 Secretario, 3 Docente, 4 Alumno (lo fija el propio
  DTO). Es **un solo rol** — el criterio de aceptación pide asignar uno.
- `esDirectorSuplente` solo viaja en `true` si el rol es Docente.
- `fechaNac` es `DateOnly`: `"YYYY-MM-DD"` sin hora, o `null`.
- **Todos los textos son obligatorios.** El proyecto tiene
  `<Nullable>enable</Nullable>` y en el DTO son `string` (no `string?`), así
  que ASP.NET responde 400 si llegan vacíos. El formulario los exige.

### Errores que la pantalla sabe mostrar

| Situación | Lo que responde el backend | Lo que se ve |
|---|---|---|
| Ya hay un director suplente | `400 "Ya existe un director suplente asignado con el nombre: X."` | Ese mismo texto (SCRUM-138) |
| Rol fuera de 1..4 | `400 "Rol inválido…"` | Ese mismo texto |
| Falta un campo | `400` `ValidationProblemDetails` | Los mensajes de validación |
| Usuario inexistente | `404 "Usuario no encontrado."` | Ese mismo texto |
| Ruta no publicada | `404` sin cuerpo | "La gestión de usuarios todavía no está habilitada" |

## Criterios de aceptación ↔ implementación

| Criterio (SCRUM-16) | Estado en el frontend |
|---|---|
| Asignar uno de los 4 roles | ✅ Selector de un solo rol; no existe "Preceptor" |
| Baja = estado inactivo, sin borrar datos | ✅ Botón "Dar de baja" con confirmación; la fila queda "Dada de baja" |
| Verificar el acceso con el token al navegar | ✅ `authGuard` revisa el vencimiento; `sesionInterceptor` maneja 401 |
| Bloquear pantallas ajenas con mensaje | ✅ `roleGuard` → panel propio con cartel "Acceso denegado" |
| Mensaje "El perfil del usuario ha sido actualizado correctamente" | ✅ Con el nombre de la persona (SCRUM-139) |
| Docente como director suplente | ✅ Casilla solo para Docentes |
| Alerta si ya existe un suplente, con el nombre | ✅ Se muestra el mensaje del backend |
| Datos personales: nombre, CUIL, DNI, correo, género, domicilio, emergencia (nombre, teléfono, afiliación), lugar de nacimiento | ✅ CUIL validado con dígito verificador y contra el DNI |
| N.° de legajo autocompletado con el DNI | ✅ Se muestra; lo asigna el backend |
| Carrera / Especialidad | ❌ No hay campo en el DTO ni columna en `Usuarios` |

## Pendientes del backend (no se tocan desde el frontend)

1. **Mergear `CargaDeUsuarios` a `main`.**
2. **Contraseña:** el alta guarda `PasswordHash = "AsignarContraseñaTemporal"`,
   que no es un hash BCrypt. `BCrypt.Verify` va a tirar excepción en el login
   de esa persona (500). Hace falta generar una contraseña inicial real (o
   el flujo de recuperación del Sprint 3).
3. **Seguridad:** `[Authorize(Roles = "Director,Secretario")]` está
   comentado en el controlador; cualquiera con Postman puede crear usuarios.
4. **`GET /api/Provincias`:** `idProvincia` es obligatorio y tiene clave
   foránea, pero no hay endpoint ni datos semilla. El frontend usa una lista
   provisoria (24 provincias en orden alfabético, ids 1..24) — ver
   `core/usuarios/modelos/provincia.ts`. Si la tabla se cargó en otro orden,
   se guarda la provincia equivocada.
5. **`modificar` guarda solo nombre, apellido y director suplente.** Ignora
   el resto del DTO (incluido el rol), pero igual lo exige completo.
6. **`GET /api/Usuarios/{id}` no devuelve** CUIL, género, afiliación ni
   `DirectorSuplente`, así que la edición no puede precargarlos. En
   particular, si se edita a un suplente y no se vuelve a tildar la casilla,
   el backend le quita la suplencia.
7. **DNI y correo repetidos:** el alta no los controla (no hay índice único).
8. **Reactivar una cuenta:** no hay endpoint.
