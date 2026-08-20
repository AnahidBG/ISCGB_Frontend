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

## `POST /api/Auth/crear-usuario-prueba`

```json
{ "dni": "43120234", "password": "Juan123" }
```

Devuelve `{ "message": "Usuario de prueba creado con éxito." }`.

Es un endpoint de testing. **No debe llegar a producción.**

## Problemas detectados

| # | Problema | Gravedad |
|---|---|---|
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
