# Contrato: gestión de usuarios (alta, modificación y baja)

> **Sprint 2** — SCRUM-16 "Gestión de usuarios y roles (Dirección)"
> Subtareas: SCRUM-130 (frontend, Milena) · SCRUM-131 (backend, Angel)
> **Actualizado:** 04/10/2026 (roles múltiples, PR #24 del backend)

Este documento reemplaza la propuesta anterior (`POST /api/Usuarios`, del
27/08/2026), que el backend nunca implementó. El backend publicó **otro
contrato** y el frontend se alineó a ese.

## Dónde está

`Controllers/CargaUsuarioController.cs` en `ISCGB_Backend`, `main` (último
cambio: commit `a3902df`, PR #24, 04/10/2026).

La clase se llama `UsuariosAdminController`, así que la ruta es
`api/UsuariosAdmin` (no `api/CargaUsuario`).

Contra un backend sin ese controlador, las rutas responden 404 sin cuerpo y la
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
| Reactivación | `PUT /api/UsuariosAdmin/alta/{id}` | — | `{ message }` |

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
  "idsRoles": [1, 3],
  "esDirectorSuplente": true
}
```

- `dni` y `cuil` viajan **solo con dígitos**.
- `idsRoles`: lista con 1 Director, 2 Secretario, 3 Docente, 4 Alumno (lo fija
  el propio DTO). **Al menos uno**: vacía responde 400. Hasta el PR #24 era
  `idRol: number` (un solo rol); un `idRol` suelto hoy se ignora y el backend
  responde 400 "Debe asignar al menos un rol al usuario.".
- ⚠️ En la **modificación**, el backend **borra todos los roles** que tenía la
  persona y deja solo los de `idsRoles`. Por eso "Editar Usuario" arranca con
  TODOS los roles actuales tildados: mandar solo el principal le quitaría los
  otros.
- Con el 3 (Docente) crea la fila en `Docentes` si no existe; con el 4
  (Alumno), la fila en `Alumnos` (legajo = DNI). Sacar un rol no borra esas
  filas.
- `esDirectorSuplente` solo viaja en `true` si uno de los roles es Docente. Si
  se quita el rol Docente, el backend le saca la suplencia.
- `fechaNac` es `DateOnly`: `"YYYY-MM-DD"` sin hora, o `null`.
- **Todos los textos son obligatorios.** El proyecto tiene
  `<Nullable>enable</Nullable>` y en el DTO son `string` (no `string?`), así
  que ASP.NET responde 400 si llegan vacíos. El formulario los exige.

### Errores que la pantalla sabe mostrar

| Situación | Lo que responde el backend | Lo que se ve |
|---|---|---|
| Ya hay un director suplente | `400 "Ya existe un director suplente asignado con el nombre: X."` | Ese mismo texto (SCRUM-138) |
| Sin roles | `400 "Debe asignar al menos un rol al usuario."` | No llega: el formulario exige al menos uno |
| Rol fuera de 1..4 | `400 "Uno o más roles son inválidos…"` | Ese mismo texto |
| Falta un campo | `400` `ValidationProblemDetails` | Los mensajes de validación |
| Usuario inexistente | `404 "Usuario no encontrado."` | Ese mismo texto |
| Ruta no publicada | `404` sin cuerpo | "La gestión de usuarios todavía no está habilitada" |

## Criterios de aceptación ↔ implementación

| Criterio (SCRUM-16) | Estado en el frontend |
|---|---|
| Asignar roles de los 4 existentes | ✅ Casillas: uno o más roles (el backend acepta una lista desde el PR #24); no existe "Preceptor" |
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

1. ~~Mergear `CargaDeUsuarios` a `main`.~~ Hecho (PR #18 y siguientes).
2. ~~Contraseña inicial.~~ Resuelto: el alta deja la contraseña pendiente y
   manda por correo el enlace a `/crear-password`.
3. **Seguridad:** `[Authorize(Roles = "Director,Secretario")]` sigue
   comentado en el controlador; cualquiera con Postman puede crear usuarios.
4. ~~Provincias.~~ Resuelto: `GET /api/Ubicaciones/paises` y
   `.../paises/{id}/provincias`, con datos semilla (`DbSeeder`).
5. **`GET /api/Usuarios/{id}` no devuelve** CUIL, género, afiliación ni
   `DirectorSuplente`, así que la edición no puede precargarlos. En
   particular, si se edita a un suplente y no se vuelve a tildar la casilla,
   el backend le quita la suplencia. (El login sí devuelve esos datos desde
   el PR #24, pero solo de quien inicia sesión.)
6. **DNI y correo repetidos:** el alta los valida en el controlador.
7. **Reactivar una cuenta:** `PUT /api/UsuariosAdmin/alta/{id}`. Si ya está
   activa responde 400; si no existe responde 404.
