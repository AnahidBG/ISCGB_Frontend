# Contrato: gestión de usuarios

Alta, modificación y baja. Sprint 2, historia SCRUM-16 "Gestión de usuarios y
roles (Dirección)": SCRUM-130 en el frontend (Milena) y SCRUM-131 en el backend
(Angel). Actualizado el **06/10/2026**.

Reemplaza la propuesta del 27/08/2026 (`POST /api/Usuarios`), que el backend
nunca implementó. El backend publicó otro contrato y el frontend se alineó a
ese.

## Dónde está

En `Controllers/CargaUsuarioController.cs` de `ISCGB_Backend`, rama `main`. La
clase se llama `UsuariosAdminController`, así que la ruta es `api/UsuariosAdmin`
y no `api/CargaUsuario`.

Contra un backend sin ese controlador las rutas responden 404 sin cuerpo, y la
pantalla avisa que la gestión de usuarios todavía no está habilitada.

## Endpoints que consume el frontend

| Acción | Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| Listado | `GET /api/Usuarios?pagina=1&registrosPorPagina=500` | | `{ paginacion, datos[] }`; 404 es lista vacía |
| Detalle | `GET /api/Usuarios/{id}` | | `UsuarioDetalle` |
| Alta | `POST /api/UsuariosAdmin/alta` | `CargaUsuarioDto` | `{ mensaje, legajoAutocompletado }` |
| Modificación | `PUT /api/UsuariosAdmin/modificar/{id}` | `CargaUsuarioDto` | `{ message }` |
| Baja | `PUT /api/UsuariosAdmin/baja/{id}` | | `{ message }` |
| Reactivación | `PUT /api/UsuariosAdmin/alta/{id}` | | `{ message }` |

### `CargaUsuarioDto`

Lo que manda el frontend:

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

`dni` y `cuil` viajan solo con dígitos. `fechaNac` es `DateOnly`: va como
`"YYYY-MM-DD"`, sin hora, o `null`.

Todos los textos son obligatorios. El proyecto tiene `<Nullable>enable</Nullable>`
y en el DTO son `string`, no `string?`, así que ASP.NET responde 400 si llegan
vacíos. El formulario los exige.

`idsRoles` es una lista con 1 Director, 2 Secretario, 3 Docente y 4 Alumno, y
tiene que traer al menos uno. Hasta el PR #24 era `idRol`, un solo número; hoy
un `idRol` suelto se ignora y el backend responde 400.

**En la modificación el backend borra todos los roles que tenía la persona y
deja solo los de `idsRoles`.** Por eso "Editar Usuario" arranca con todos los
roles actuales tildados: mandar solo el principal le quitaría los otros.

Con el rol Docente el backend crea la fila en `Docentes` si no existe, y con
Alumno la fila en `Alumnos`, con el DNI como legajo. Sacar un rol no borra esas
filas.

`esDirectorSuplente` solo viaja en `true` si uno de los roles es Docente. Si se
le quita ese rol, el backend le saca la suplencia.

### Errores que la pantalla sabe mostrar

- Ya hay un director suplente: `400 "Ya existe un director suplente asignado con
  el nombre: X."`. Se muestra ese mismo texto (SCRUM-138).
- Sin roles: `400 "Debe asignar al menos un rol al usuario."`. No llega, porque
  el formulario exige al menos uno.
- Rol fuera de 1 a 4: `400 "Uno o más roles son inválidos…"`. Se muestra tal
  cual.
- Falta un campo: `400` con `ValidationProblemDetails`. Se muestran los mensajes
  de validación.
- Usuario inexistente: `404 "Usuario no encontrado."`. Se muestra tal cual.
- Ruta no publicada: `404` sin cuerpo. Se avisa que la gestión de usuarios
  todavía no está habilitada.

## Criterios de aceptación

Lo que pide SCRUM-16 y cómo está en el frontend:

- Asignar roles de los cuatro existentes: hecho, con casillas para uno o más
  roles. No existe "Preceptor".
- Baja como estado inactivo, sin borrar datos: hecho. El botón "Dar de baja"
  pide confirmación y la fila queda como "Dada de baja".
- Verificar el acceso con el token al navegar: hecho. `authGuard` revisa el
  vencimiento y `sesionInterceptor` maneja el 401.
- Bloquear las pantallas ajenas con un mensaje: hecho. `roleGuard` manda al
  panel propio con el cartel "Acceso denegado".
- Mensaje "El perfil del usuario ha sido actualizado correctamente": hecho, con
  el nombre de la persona (SCRUM-139).
- Docente como director suplente: hecho, con una casilla solo para Docentes.
- Alerta si ya existe un suplente, con su nombre: hecho. Se muestra el mensaje
  del backend.
- Datos personales (nombre, CUIL, DNI, correo, género, domicilio, contacto de
  emergencia y lugar de nacimiento): hecho. El CUIL se valida con el dígito
  verificador y contra el DNI.
- Número de legajo autocompletado con el DNI: hecho. Lo asigna el backend y se
  muestra.
- Carrera o especialidad: **falta**. No hay campo en el DTO ni columna en
  `Usuarios`.

## Pendientes del backend

1. `POST /api/UsuariosAdmin/establecer-password` quedó debajo del
   `[Authorize(Roles = "Director,Secretario")]` de la clase y no tiene
   `[AllowAnonymous]`. Quien crea su contraseña desde el enlace del mail no
   tiene sesión, así que el endpoint le responde 401.
2. `GET /api/Usuarios/{id}` no devuelve CUIL, género, afiliación ni
   `DirectorSuplente`, y la edición no puede precargarlos. Si se edita a un
   suplente y no se vuelve a tildar la casilla, el backend le quita la
   suplencia. El login sí devuelve esos datos, pero solo de quien inicia sesión.
3. El DNI y el correo repetidos se validan en el controlador del alta.

Ya resuelto: el controlador exige `[Authorize(Roles = "Director,Secretario")]`,
el alta deja la contraseña pendiente y manda por correo el enlace a
`/crear-password`, las provincias salen de `GET /api/Ubicaciones/paises` y
`.../paises/{id}/provincias`, y una cuenta se reactiva con
`PUT /api/UsuariosAdmin/alta/{id}` (400 si ya está activa, 404 si no existe).
