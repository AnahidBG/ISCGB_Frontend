# Contrato: alta de usuario (`POST /api/Usuarios`)

> **Para:** Angel / Anahid (backend)
> **De:** frontend — Milena
> **Fecha:** 27/08/2026
> **Sprint:** 2 — "Gestión de usuarios y roles (Dirección)"

La pantalla de alta de usuario **ya está hecha y funcionando** en el frontend
(`/director/usuarios/nuevo`). Lo único que falta es el endpoint. Este
documento describe exactamente qué tiene que recibir y devolver para que la
pantalla funcione **sin tocar una línea de Angular**.

---

## 1. Por qué hace falta

Hoy la única forma de crear un usuario es `POST /api/Auth/crear-usuario-prueba`.
Ese endpoint:

```csharp
// AuthController.cs, línea 78 — el comentario es del propio código:
// "Función de crear un usuario, esto es de prueba. No quedaría de esta forma."
```

- Acepta **solo** `{ dni, password }` (reusa `LoginRequestDto`).
- Escribe a mano `Email = "prueba@test.com"`.
- Asigna a mano `IdRol = 1`, siempre el mismo rol.
- No guarda nombre, apellido, teléfono ni ningún otro dato.

Es decir: **no se puede dar de alta a una persona real con él.** Toda alta hoy
termina siendo un usuario llamado "nadie", con correo inventado y el rol
equivocado, que después hay que corregir a mano en la base.

`UsuariosController` tiene hoy solo dos `GET` (`GetUsuarios` y
`GetUsuarioById`). Falta el `POST`.

---

## 2. Qué manda el frontend

`POST /api/Usuarios`
`Content-Type: application/json`

```json
{
  "dni": "43880335",
  "nombre": "María",
  "apellido": "Gómez",
  "email": "maria.gomez@ejemplo.com",
  "password": "unaClaveInicial",
  "roles": ["Docente", "Director"],
  "estadoUsuario": true,
  "telefono": "3511234567",
  "fechaNac": "1990-05-14",
  "direccion": "Av. Siempreviva 742",
  "lugarNacimiento": "Villa Cura Brochero",
  "contactoEmergencia": "Juan Gómez",
  "telefonoEmergencia": "3517654321"
}
```

### Detalle campo por campo

| Campo | Tipo | ¿Obligatorio? | Notas |
|---|---|---|---|
| `dni` | string | Sí | **Ya viene normalizado**: solo dígitos, sin puntos. El frontend lo limpia con `normalizarDni()` antes de enviar. |
| `nombre` | string | Sí | Ya viene con `trim()`. |
| `apellido` | string | Sí | Ya viene con `trim()`. |
| `email` | string | Sí | Validado como correo en el frontend. Validar igual del lado del servidor. |
| `password` | string | Sí | **En texto plano.** Mínimo 8 caracteres (validado en el frontend). El backend la hashea con BCrypt antes de guardarla en `PasswordHash`, igual que hace hoy `crear-usuario-prueba`. |
| `roles` | string[] | Sí, al menos uno | **Nombres, no ids** — ver la sección 3. |
| `estadoUsuario` | bool | Sí | `true` = puede iniciar sesión. Va directo a la columna `EstadoUsuario`. |
| `telefono` | string \| null | No | |
| `fechaNac` | string \| null | No | Formato `"YYYY-MM-DD"`, sin hora — mapea a `DateOnly?` (`fecha_nac`). |
| `direccion` | string \| null | No | |
| `lugarNacimiento` | string \| null | No | |
| `contactoEmergencia` | string \| null | No | |
| `telefonoEmergencia` | string \| null | No | |

Los campos opcionales vacíos viajan como `null`, nunca como `""`.

### Lo que NO se manda

- **`idProvincia`**: la columna existe en `Usuarios`, pero no hay endpoint que
  liste las provincias, así que el frontend no puede ofrecer un desplegable con
  datos reales. **Si publican un `GET /api/Provincias`, agrego el campo.**
- **`tokenRecuperacion` / `expiracionToken`**: los maneja el sistema cuando
  exista "recuperar contraseña" (Sprint 3), no se cargan a mano.
- **`idUsuario`**: lo asigna la base.

---

## 3. Los roles van por nombre, no por id

`roles` llega como `["Docente", "Director"]` y no como `[2, 4]`.

**Por qué:** el frontend no tiene forma confiable de conocer los ids. No hay
ningún endpoint que devuelva la tabla `Roles`, y hardcodear `"Docente" = 2` en
Angular es exactamente el tipo de dato que se desincroniza el día que alguien
toca la tabla, sin que nadie se entere hasta que un usuario queda con el rol
equivocado.

El backend sí tiene la tabla a mano, así que la traducción le sale gratis:

```csharp
var rolesEncontrados = _context.Roles
    .Where(r => dto.Roles.Contains(r.Rol))
    .ToList();

if (rolesEncontrados.Count != dto.Roles.Count)
    return BadRequest(new { message = "Alguno de los roles no existe." });
```

Los cuatro valores posibles son exactamente: `"Director"`, `"Secretario"`,
`"Docente"`, `"Alumno"`. No existe `"Preceptor"` — sus funciones están dentro
de Secretario (regla de negocio #5 del MVP).

**Alternativa igual de válida:** si prefieren recibir ids, publiquen un
`GET /api/Roles` que devuelva `[{ idRol, rol }]` y lo cambio de este lado. Lo
que no sirve es que el frontend adivine los números.

Recordar que un usuario puede tener **más de un rol**: la tabla
`Usuarios_roles` es muchos a muchos y el caso es real (un director que además
dicta una materia). Hay que crear una fila por cada rol del arreglo.

---

## 4. Qué tiene que responder

| Situación | Código | Qué hace el frontend |
|---|---|---|
| Alta correcta | `200` o `201` | Muestra la pantalla de confirmación. No lee el cuerpo, así que pueden devolver lo que quieran (idealmente el usuario creado). |
| DNI o email ya existente | **`409 Conflict`** | Muestra: *"Ya existe un usuario con ese DNI o ese correo."* |
| Datos inválidos | `400` | Muestra el mensaje genérico de error. |
| Sin permisos | `401` / `403` | Ídem. |
| El endpoint todavía no existe | `404` / `405` | Muestra: *"El servidor todavía no tiene habilitada el alta de usuarios."* ← **es lo que pasa hoy.** |

El `409` es el que más importa: el DNI repetido es el error más común de un
alta, y con un `400` genérico la persona no sabe si se equivocó en un dato o si
se rompió algo.

---

## 5. Validaciones que el backend tiene que hacer igual

El frontend ya valida DNI, formato de correo y largo de contraseña, **pero eso
no es seguridad**: cualquiera puede mandar el `POST` desde Postman sin pasar
por la pantalla. Del lado del servidor hace falta al menos:

- `dni`, `nombre`, `apellido`, `email`, `password` no vacíos.
- `email` con formato válido y **único** en la tabla.
- `dni` **único** en la tabla. Hoy la columna es `nvarchar` sin restricción de
  unicidad: convendría agregarle un índice único, porque el login busca por DNI
  (`FirstOrDefault(u => u.Dni == request.Dni)`) y con dos usuarios repetidos
  entraría siempre el mismo, en silencio.
- Al menos un rol, y que todos existan en `Roles`.
- Hashear la contraseña con BCrypt. **Nunca guardarla en texto plano.**

---

## 6. Seguridad — dos cosas para revisar

1. **El endpoint tiene que estar protegido con `[Authorize(Roles = "Director")]`.**
   El `roleGuard` del frontend impide que a la pantalla entre alguien que no es
   Director, pero eso corre en el navegador y se saltea con las herramientas de
   desarrollador. Sin el `[Authorize]`, cualquiera con un token válido —un
   alumno, por ejemplo— podría crearse un usuario Director desde Postman.

2. **La contraseña viaja en texto plano por HTTP.** Hoy el sistema corre sobre
   `http://localhost:5231`, lo cual está bien para desarrollar. Antes de que
   esto se use en el instituto tiene que ir por **HTTPS**, o cualquiera en la
   misma red ve las contraseñas de todos los usuarios que se den de alta.

---

## 7. Lo que queda pendiente después de esto

- **Cambio de contraseña** (Sprint 3): hoy la persona se queda para siempre con
  la clave que le puso el Director. La pantalla se lo aclara a quien da el
  alta, pero es una solución provisoria.
- **Baja y modificación** de usuarios: ISCGB-PROJECT.md le da al Director
  "alta, baja y modificación". Esto cubre solo el alta.
- **`GET /api/Usuarios` no devuelve el estado del legajo** de cada persona, así
  que esa columna del panel del Director se ve vacía. Es un `GET` distinto y
  está anotado aparte.
