# Contrato de la API

Relevado el **06/10/2026** contra el código de `ISCGB_Backend` (`main` en
`f856989`, PR #29) y lo que consume el frontend. El recupero de contraseña se
relevó el 23/10/2026 (PR #40). El backend está a cargo de
Angel Silva.

La dirección base en desarrollo es `http://localhost:5231`.

Describe la API como está hoy, no como debería estar. Los problemas
detectados están junto a cada endpoint.

## Seguridad del backend (10/11/2026)

Relevado contra `main` del backend en `e26afd8` (commits `523d05b` y
`dbb76fa`, Angel). Vale para todos los endpoints de este documento:

- **Sesión en todo.** `Program.cs` tiene una `FallbackPolicy`: sin token, todo
  responde 401. Los únicos públicos son `login`, `recuperar-contrasena`,
  `establecer-password` y `Ubicaciones`, marcados `[AllowAnonymous]`.
- **Lo de todo el instituto**, para Director y Secretario
  (`UsuarioActual.RolesAdministrativos`): el buscador, el listado de
  `Usuarios`, `pendientes`, `resumen-estado` y `aprobados` de Legajos,
  `pendientes` y `todos` de Justificativos, las dos auditorías y
  `docentes-disponibles` y `alumnos-disponibles` de Materias.
- **Lo de una persona** (`Usuarios/{id}`, `Legajos/usuario/{id}`,
  `Legajos/{id}/faltantes`, `Justificativos/{id}/justificativos`, y subir un
  legajo o un justificativo) lo puede pedir ella misma o Director y Secretario.
  Con otro id responde 403 sin body. `sesionInterceptor` lo trata como un 403
  de rol: vuelve al panel con el aviso de acceso denegado.
- **El auditor sale del token.** En `auditar` de Legajos y de Justificativos el
  `idUsuarioAuditor` que manda el frontend se ignora.
- **Intentos.** `login`, `recuperar-contrasena` y `establecer-password` admiten
  10 pedidos por minuto por IP; después responden 429 sin body, y el frontend
  muestra "Hiciste demasiados intentos seguidos" (`MENSAJE_DEMASIADOS_INTENTOS`).
- **Archivos.** `ValidadorArchivos` revisa la extensión, el tamaño (10 MB; la
  foto de perfil, 5 MB) y los primeros bytes. Los nombres llevan un código
  aleatorio, porque `/uploads` se sirve sin token. Los contratos se guardan
  fuera de `wwwroot` y solo se bajan con el token.
- **Configuración.** La URL del frontend (CORS y enlaces de los mails) sale de
  `Frontend:Url` en `appsettings.json`. Swagger solo está en desarrollo.

## Login: `POST /api/Auth/login`

Autentica por DNI, no por correo. El DNI va sin puntos.

```json
{ "dni": "11111111", "password": "Test1234" }
```

Devuelve `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": "Dolores Díaz",
  "estado_usuario": true,
  "dni": "11111111",
  "telefono": null,
  "telefonoEmergencia": null,
  "lugar_Nacimiento": null,
  "nombreContactoEmergencia": null,
  "direccion": null,
  "email": "dolores@ejemplo.com",
  "idUsuario": 1,
  "roles": [{ "idRol": 3, "nombreRol": "Docente" }],
  "afiliacion_Emergencia": "APROSS",
  "fecha_Nacimiento": "1990-05-14",
  "cuil": "20111111112",
  "genero": "Femenino",
  "esDirectorSuplente": false
}
```

Los roles vienen en el cuerpo, en `roles`, y el frontend arma la sesión con
esa lista.

Los nombres mezclan convenciones: `telefonoEmergencia`, `estado_usuario`,
`lugar_Nacimiento`. El frontend los replica tal cual en `RespuestaLogin` y los
ordena una sola vez al convertirlos a `Sesion`.

Los últimos cinco campos llegaron con el PR #24. `RespuestaLogin` los tipa como
opcionales, pero no pasan a `Sesion`: ninguna pantalla los usa.
`esDirectorSuplente` no da permisos de Director; los permisos salen de `roles`.

Devuelve `401` con uno de estos dos mensajes (desde `523d05b`, el mismo para
"no existe", "inactiva" y "contraseña incorrecta"):

```json
{ "message": "DNI o contraseña incorrectos." }
{ "message": "Debe configurar su contraseña por primera vez usando el enlace enviado a su correo electrónico." }
```

El segundo sale cuando la cuenta todavía no pasó por `/crear-password`. El
frontend no lee el body: con cualquier 401 muestra "El DNI o la contraseña no
son correctos.". Con más de 10 intentos por minuto responde 429.

La ruta es `POST /api/Auth/login`, no `POST /api/Auth`.

### El token

```json
{
  "nameid": "1",
  "DNI": "11111111",
  "role": "Docente",
  "nbf": 1787094079,
  "exp": 1787101279,
  "iat": 1787094079
}
```

Es `HS256` y dura 2 horas.

`role` trae el nombre del rol, no su id, y hay un claim por cada rol. Con más
de uno el JWT los serializa como arreglo, así que `role` puede llegar como
texto o como lista. El frontend no lo usa para decidir el rol: toma los roles y
sus ids de `roles`, en el cuerpo, y los guarda en `Sesion.rolesConId`.

`POST /api/Auth/crear-usuario-prueba` ya no existe: lo borró `523d05b`.

## Recupero y cambio de contraseña (SCRUM-28)

Relevado el **04/11/2026** contra `main` del backend, que tiene `bddb5ef` (Anahid)
desde el PR #41 (`2261f7d`, 27/10). Son dos endpoints públicos
(`[AllowAnonymous]`): el paso 1 en `AuthController` y el paso 2 en
`UsuariosAdminController`. Los consume `AuthService` (`solicitarRecuperacion` y
`restablecerPassword`).

### `POST /api/Auth/recuperar-contrasena`

```json
{ "dni": "12345678" }
```

Si el DNI corresponde a una cuenta activa, guarda un token nuevo en
`Usuarios.token_recuperacion`, con `expiracion_token` a **1 hora**, y manda un mail
con el enlace `{Frontend:Url}/restablecer-password?token=...` (en desarrollo,
`http://localhost:4200`). Responde `200`
con el mismo mensaje exista o no el DNI:

```json
{ "message": "Si el DNI existe en el sistema, se enviará un correo con instrucciones." }
```

- `400` `{ message }` si el DNI viene vacío. El front valida antes (7 u 8 números).
- Si falla el envío del mail, el backend lo loguea y responde el mismo `200`: ya no
  devuelve `500`, para no revelar que el DNI existe. Desde el front no se puede saber
  si el mail salió.

Lo usan dos pantallas: `/recuperar-contrasena` (sin sesión, con el DNI que escribe la
persona) y `/configuracion` (con el DNI de la sesión).

### `POST /api/UsuariosAdmin/establecer-password`

```json
{ "token": "3f2a...", "nuevaPassword": "Clave1234" }
```

Busca la cuenta por `token_recuperacion`, guarda el hash con BCrypt y borra el token
(es de un solo uso). Responde `200` `{ mensaje }` (con "a", no `message`). Los `400`
llegan en dos formas: `{ message }` si falta el token o la contraseña, y texto suelto
si el token no existe, ya se usó o venció. El front no lee el cuerpo: trata cualquier
`400` como "enlace no válido".

Es el **único** endpoint para guardar la contraseña: `bddb5ef` borró
`POST /api/Auth/establecer-password` (ahora da `404`). Lo usan el mail de alta
(`/crear-password`) y el de recupero (`/restablecer-password`). En `api.ts` siguen
siendo dos claves con la misma URL (`RUTAS_API.establecerPassword` y
`RUTAS_API.restablecerPassword`), porque el remedio cambia: en el alta hay que pedirle
otro enlace a Dirección y en el recupero la persona lo pide sola.

### Pendientes del backend

- Validar la política de contraseñas (8 caracteres, mayúscula, minúscula y número):
  hoy solo exige que no venga vacía. El front la valida, pero es UX (SCRUM-225). La
  regla de que no incluya el DNI solo la puede controlar el back: `/restablecer-password`
  no conoce el DNI.
- No existe el cambio con la contraseña actual. Por eso "Configuración" manda el mismo
  enlace de recupero al correo de la sesión.
- El mail de recupero reusa la plantilla del alta: el asunto dice "Configura tu
  contraseña" y el texto, "crear tu contraseña".

Resuelto en `523d05b`: el enlace del mail sale de `Frontend:Url` y ya no está fijo
en `http://localhost:4200`.

## Gestión de usuarios

El Director crea, edita, desactiva y reactiva cuentas. Desactivar es una baja
lógica: la fila queda con `estadoUsuario = false` y sigue en el listado.

- `POST /api/UsuariosAdmin/alta` crea la cuenta con un `CargaUsuarioDto`.
- `PUT /api/UsuariosAdmin/modificar/{id}` actualiza el perfil completo con el
  mismo DTO. **Reemplaza todos los roles**: borra los que tenía la persona y
  deja solo los de `idsRoles`.
- `PUT /api/UsuariosAdmin/baja/{id}` desactiva la cuenta. No lleva cuerpo.
- `PUT /api/UsuariosAdmin/alta/{id}` la reactiva. No lleva cuerpo.

Los roles van en una lista, `idsRoles: [1, 3]`. Si viene vacía o falta,
responde `400 "Debe asignar al menos un rol al usuario."`.

El detalle campo por campo está en `contrato-alta-usuario.md`.

## Mi perfil

Cualquier persona con sesión, de cualquier rol, actualiza sus propios datos de
contacto. Está en `UsuariosController`, en `api/Usuarios`. Se relevó el
11/10/2026 contra el código del backend.

### `PUT /api/Usuarios/mi-perfil`

Con `[Authorize]` y sin rol. La persona sale del token (claim `NameIdentifier`),
no de la URL ni del cuerpo. Recibe un `ActualizarPerfilDto`, con todos los
campos opcionales:

```json
{
  "telefono": "3511234567",
  "telefonoEmergencia": "3517654321",
  "lugarNacimiento": "Villa Dolores",
  "contactoEmergencia": "Juan Gómez",
  "direccion": "Av. Siempreviva 742",
  "idProvincia": 6,
  "genero": "Femenino",
  "afiliacionEmergencia": "APROSS",
  "email": "nuevo@ejemplo.com"
}
```

Responde `200` con `{ "message": "Datos del perfil actualizados correctamente." }`.

- **Un campo vacío lo borra** (desde el 17/10/2026, commit `d771acb`). Un texto
  que llega `""` queda en `null`, uno ausente (o `null`) se deja como estaba, y
  `idProvincia` menor o igual a 0 borra la provincia. El correo es la excepción:
  uno vacío se ignora. Un cuerpo `{}` responde `200` y no cambia nada. Antes de
  esa fecha los vacíos se ignoraban y no había manera de borrar un dato.
- El DTO ahora tiene `[EmailAddress]` y `[MaxLength]` (correo y contacto de
  emergencia 150, teléfonos 30, dirección 255, género 20, afiliación 100): un
  valor que no cumple responde `400` de validación automática de ASP.NET.
- **El correo no se puede repetir.** Si cambia y otra persona ya lo usa, responde
  `400` con
  `{ "message": "El correo electrónico ingresado ya está registrado a nombre de otra persona." }`.
  No valida el formato: `"hola"` pasa.
- Responde `404` con `{ "message": "Usuario no encontrado." }` si el id del token no
  existe, y `401` sin cuerpo si el token no trae el id.
- No valida el largo de los textos. Pasado el de la columna (`varchar`: teléfonos
  30, dirección 255, correo, lugar de nacimiento y contacto de emergencia 150)
  SQL Server corta el guardado y la API responde `500`.
- Por acá no se cambian el nombre, el apellido, el DNI ni los roles. Eso lo hace
  Dirección con `PUT /api/UsuariosAdmin/modificar/{id}`.

`genero` y `afiliacionEmergencia` no están en la pantalla. Hasta el 10/11/2026
`GET /api/Usuarios/{id}` no los devolvía y no se podían precargar. Desde
`d60d93c` sí los devuelve (ver abajo), así que "Mi perfil" ya podría ofrecerlos:
queda para cuando se pida.

### `GET /api/Usuarios/{id}`

Lo puede pedir la propia persona, o Director y Secretario. Desde el 10/11/2026
(`d60d93c`) trae, además de los datos de contacto y los roles, lo que carga el
alta: `cuil`, `genero`, `afiliacionEmergencia`, `esDirectorSuplente` (si alguno
de sus perfiles de docente lo es) y `legajo` (del perfil de alumno, `null` si no
es alumno). "Editar usuario" los precarga, así que ya no hay que volver a
cargar el CUIL ni volver a tildar la suplencia. El legajo se muestra tal cual si
no es el DNI: es un número cargado a mano y el backend lo respeta aunque se
corrija el DNI.

Cómo lo usa el frontend, en `/perfil`:

- `UsuariosService.actualizarMiPerfil(datos)` arma el cuerpo con `datosAEnviar`
  (`core/usuarios/mis-datos.ts`): todos los textos, recortados (los vacíos viajan
  vacíos, para borrarlos), y la provincia, o `0` si no hay ninguna.
- Cualquier dato se puede vaciar para borrarlo, menos el correo, que es
  obligatorio y tiene que parecer un correo.
- El backend no valida el formato de los teléfonos ni el de los correos. El
  formulario sí (`erroresDeMisDatos`): un teléfono tiene que tener solo números,
  espacios, guiones, puntos o paréntesis, y entre 6 y 15 dígitos. Es una regla del
  frontend; el formulario de Dirección no tiene ninguna.
- Un `4xx` con texto se muestra tal cual (el del correo repetido, por ejemplo). Un
  `5xx`, la falta de red o una ruta que no existe, con un mensaje genérico.
- Si sale bien, `AuthService.actualizarCorreo(...)` pone el correo nuevo en la sesión
  y en `sessionStorage`, para que el encabezado lo muestre sin volver a iniciar
  sesión.

### `POST /api/Usuarios/foto-perfil`

Con `[Authorize]` y sin rol. Recibe la imagen en `multipart/form-data` (`Foto`, solo
`.jpg`, `.jpeg` y `.png`; si no, `400` con
`{ "message": "Formato no válido. Solo se permiten JPG y PNG." }`), la guarda en
`wwwroot/uploads/perfiles/` y la ruta queda en `Usuarios.FotoPerfil`. Responde `200`
con `{ "message": "Foto de perfil actualizada exitosamente.", "url": "/uploads/perfiles/…" }`.
No tiene tope de tamaño ni borra la foto anterior del disco.

Desde el 17/10/2026 (commit `d771acb`) el login devuelve esa ruta en `foto`. Con eso
el frontend cierra el circuito:

- `AuthHttpService` arma la URL completa (`urlArchivoSubido`) en `Sesion.fotoUrl`, y
  `EstructuraPanel` la muestra en el encabezado. Sin foto, o si no carga, van las
  iniciales.
- "Mi perfil" tiene la sección "Foto de perfil": `validarFotoPerfil` (JPG o PNG, hasta
  2 MB; el tope es solo del frontend), `UsuariosService.subirFotoPerfil(...)` y, si
  sale bien, `AuthService.actualizarFoto(...)`, que la deja en la sesión. "Cambiar
  foto" del menú de la persona lleva ahí.
- `GET /api/Usuarios` y `GET /api/Usuarios/{id}` siguen sin devolverla: no se puede
  ver la foto de otra persona.

## Programa de materia

### `GET /api/ProgramasMateria/contexto-docente/{idUsuario}`

Devuelve el docente y las materias que tiene asignadas. "Entregar programa" lo
usa para llenar el selector de materias.

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

Responde `404` si el usuario no está registrado como docente.

La comisión identifica la cursada de esa asignación y se muestra en el
selector. No se envía al guardar, porque el programa se guarda por docente y
materia.

Falta que cada materia traiga los datos del plan de estudios: `formato` (el
código de la Res. 166/23, como `"A"`, `"T"`, `"MT"` o `"MA"`, o el nombre
completo), `horasCatedra` y `horasTotales`. Están en la tabla `materias`, pero
`MateriaDocenteDto` no los incluye. El frontend ya los lee si vienen; mientras
tanto, el formulario deja el formato y las horas para cargar a mano.

### `POST /api/ProgramasMateria`

Guarda el programa con sus unidades en un solo pedido. Es el `CrearProgramaDto`,
con `contenidos` anidado:

```json
{
  "idDocente": 1,
  "idMateria": 3,
  "condicion": "Regular",
  "fundamentacion": "…",
  "objetivosGenerales": "…",
  "objetivosEspecificos": "…",
  "horasSemanales": "4",
  "horasCuatrimestrales": "64",
  "formatoCurricular": "Asignatura",
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

El DTO está en `PascalCase`, pero ASP.NET Core no distingue mayúsculas al leer
el JSON, así que el `camelCase` del frontend entra sin traducir.

Devuelve `200`, no `201`, y no expone la ubicación del recurso creado:

```json
{ "message": "Programa y contenidos guardados con éxito.", "idPrograma": 12 }
```

**Ese `idPrograma` es la única forma de pedir el PDF después.** Si se descarta,
la persona se queda sin manera de bajarlo.

Responde `404` si el docente o la materia no existen:

```json
{ "message": "El docente especificado no existe." }
{ "message": "La materia especificada no existe." }
```

### `GET /api/ProgramasMateria/{idPrograma}/pdf`

Genera el PDF con QuestPDF y lo devuelve como archivo: `200`, con
`Content-Type: application/pdf` y el nombre `Programa_Materia_{idMateria}.pdf`.
Si el programa no existe, `404` con el cuerpo vacío.

No es JSON. El `HttpClient` de Angular necesita `responseType: 'blob'`, o
intenta parsear los bytes del archivo y falla siempre.

El nombre usa el id de la materia y no el del programa. Dos programas de la
misma materia se bajan con el mismo nombre.

El PDF arma las secciones 1 (Fundamentación), 2.1 (Objetivos generales), 3
(Contenidos) y 4 (Estrategias metodológicas). Los demás campos se guardan, pero
todavía no se imprimen.

## Legajos

### La entrega en papel

`presentado_fisico` dice si Secretaría tiene además el papel de ese documento.
Desde el 04/10/2026 no lo declara quien sube: lo marca quien revisa.

**Al subir.** El Docente o el Alumno ve solo el recordatorio de entregarlo en
papel. `POST /api/Legajos` no manda `presentadoFisico`: en `SubirLegajoDto` esa
propiedad está comentada, el backend no lee lo que llegue y el documento nuevo
queda con la columna en `NULL`. Mis Documentos lo muestra como no entregado.

**Al revisar.** En un legajo ajeno (`legajo/usuario/:idUsuario`), el Secretario
o el Director tiene la casilla "Presentado físicamente" en cada documento
subido. Se guarda con la auditoría, en `PUT /api/Legajos/auditar/{idLegajo}`
(desde el 06/10/2026, `AuditoriaLegajoDto.PresentadoFisico`, un `bool?`):

```jsonc
// PUT /api/Legajos/auditar/{idLegajo}?idUsuarioAuditor={id}
{ "estado": "Aprobado", "comentario": null, "presentadoFisico": true }
```

`AuditarLegajo` asigna **siempre** estos cuatro campos y guarda: el auditor, el
estado, el comentario y `presentadoFisico`. Lo que no llega queda en `NULL`. Por
eso el frontend los manda todos, y `presentadoFisico` siempre como booleano,
nunca ausente. Responde `200`:

```json
{
  "message": "Auditoría de legajo actualizada correctamente.",
  "idLegajo": 1,
  "estado": "Aprobado",
  "presentadoFisico": true
}
```

Los errores son `404` si el legajo no existe y `400` si el auditor no es válido,
los dos con `{ "message": "…" }`. Desde el 10/11/2026 (`bd7b565`), al pasar a
`Rechazado` le manda un mail a la persona con el `comentario` como motivo
(`EnviarAvisoRechazoAsync`). Si el mail falla, la auditoría queda guardada igual.

Cómo lo usa la pantalla:

- **Documento pendiente.** La casilla se tilda en pantalla y viaja con el
  veredicto, al aprobar o rechazar. No se guarda sola: eso le asignaría un
  auditor a un documento que nadie revisó.
- **Documento con veredicto.** Es el caso de "el papel llegó días después". Al
  tildar o destildar se guarda en el momento, reenviando el mismo `estado` y el
  mismo `comentario` que ya tiene, para que la auditoría no los pise. Mientras
  se guarda la casilla queda deshabilitada y, si falla, vuelve a su valor
  anterior y se muestra el error.
- **Auditor.** Como el endpoint asigna siempre el auditor, tildar la casilla de
  un documento que ya revisó otra persona deja a quien tildó como "Revisado
  por".

La lógica de qué se reenvía está en `core/legajos/entrega-en-papel.ts`.

Todavía falta `[Authorize(Roles = "Director,Secretario")]` en el endpoint.

Cuidado con los datos viejos: las filas que tienen `presentado_fisico = 1` de
antes del 04/10/2026 las tildó la propia persona al subir. No las verificó
Secretaría.

`GET /api/Legajos/usuario/{id}` devuelve además `auditor`, el nombre de quien
revisó o el texto `"Sin auditor asignado"`. Mis Documentos lo muestra como
"Revisado por X".

### El comentario de rechazo

Es la regla de negocio 4. Desde el 05/10/2026, quien rechaza un documento no
escribe el motivo a mano: marca uno o más de los 7 motivos de la institución y
puede agregar una aclaración. El texto armado viaja en `comentario`, igual que
antes. El contrato no cambió.

```jsonc
// PUT /api/Legajos/auditar/{idLegajo}?idUsuarioAuditor={id}
{
  "estado": "Rechazado",
  "comentario": "Falta sello y/o firma; Documento incompleto. Aclaración: falta la hoja 2"
}
```

Cómo se arma:

- Los motivos van unidos con `"; "`, en el orden de la lista oficial y no en el
  que se marcaron.
- Si hay aclaración, se agrega `". Aclaración: <texto>"`. Se recorta y se pasa
  a una sola línea; vacía o con solo espacios, no se agrega.
- Sin ningún motivo marcado no se envía nada.

La lista y el armado del texto están en `core/legajos/motivos-rechazo.ts`
(`MOTIVOS_RECHAZO` y `comentarioDeRechazo`). El cuadro es
`shared/ui/cuadro-rechazo`: lo usan el legajo y los justificativos.

`legajo.comentario` es `varchar(max)` y `AuditoriaLegajoDto.Comentario` no
tiene `[MaxLength]`. Los 7 motivos juntos suman 228 caracteres, así que la
aclaración no lleva `maxlength`. Al ser `varchar` y no `nvarchar`, las tildes y
la ñ se guardan bien con una collation Latin1, pero un emoji se perdería.

El Docente y el Alumno ven el motivo completo en Mis Documentos, en la tarjeta
"Documentación rechazada" del panel y en la campana. Los rechazos viejos, con
motivo libre, se muestran igual.

### El rechazo de un justificativo

Desde el 10/11/2026 (`bd7b565`), `PUT /api/Justificativos/auditar/{id}` recibe
`AuditarJustificativoDto { estado, comentario? }`. El auditor sale del token.
Al pasar a `Rechazado`, el backend le manda un mail a la persona
(`EnviarAvisoRechazoAsync`) con el período, el tipo y el `comentario` como
motivo. El comentario **no se guarda**: solo viaja en el mail.

```jsonc
// PUT /api/Justificativos/auditar/{idJustificativo}
{ "estado": "Rechazado", "comentario": "Falta sello y/o firma" }
```

El frontend manda `comentario` solo al rechazar, y no deja rechazar sin al
menos un motivo: usa el mismo cuadro y los mismos `MOTIVOS_RECHAZO` que el
legajo. La revisión está en `features/justificativos/revision-justificativos`,
que usan el Panel del Secretario y el Panel del Director.

Pendientes del backend:

- `GET /api/Justificativos/pendientes` no dice de quién es cada uno (ni id ni
  rol), y `auditar` no impide revisar el propio. Un Secretario puede aprobar su
  propio justificativo. Haría falta `idUsuario` o el rol en
  `JustificativoPendienteDto`, y que `auditar` responda 403 si
  `justificativo.IdUsuario` es el del token.
- Como el comentario no se guarda, la persona no ve el motivo en "Mis
  justificativos": solo le queda el mail.
- El mail dice "Secretaría revisó…" aunque haya rechazado el Director.

## Frecuencia de los avisos de documentación faltante

El backend manda por mail los avisos de documentación faltante. Cada cuántos
días se repiten se lee y se guarda en el mismo recurso.

`GET /api/Configuracion/frecuencia-notificaciones` devuelve
`{ "diasFrecuencia": 7 }`. Si nunca se configuró, devuelve 7.

`PUT /api/Configuracion/frecuencia-notificaciones` recibe un entero positivo,
`{ "diasFrecuencia": 14 }`, y devuelve
`{ "message": "Frecuencia actualizada a 14 días exitosamente." }`.

Si el valor es cero o negativo, responde `400` con
`{ "message": "La frecuencia debe ser mayor a 0 días." }`. Si el cuerpo no trae
un entero, el 400 lo arma ASP.NET y llega como `ValidationProblemDetails`, sin
`message`.

El frontend lo usa en la pantalla "Frecuencia de avisos"
(`/secretario/frecuencia-avisos`), solo para Secretario. Valida un entero entre
1 y 365 antes de enviar y, si el backend rechaza el valor, muestra su mensaje.

El envío no es inmediato. Desde `dbb76fa`, `NotificadorFaltantesWorker` corre
una vez por día a las 08:00, hora argentina (`Notificaciones:HoraEnvio` y
`ZonaHoraria` en `appsettings.json`), y a cada persona activa le escribe solo si
pasaron los días de la frecuencia desde su último aviso. Si el servidor arranca
después de esa hora, hace una pasada en ese momento.

El mail lista lo que le falta a la persona según su rol
(`DocumentacionService.CalcularFaltantes`): lo que nunca subió, lo rechazado y
los documentos anuales que no subió en el año en curso. El frontend usa la
misma regla para los anuales (`motivoDeVencimiento` en
`core/legajos/progreso-legajo.ts`): uno de un año anterior sale como vencido en
la campana y en "Mis documentos", y no suma en la barra de progreso.

Los dos endpoints piden sesión; el `PUT`, además, Director o Secretario.

Pendiente del backend: el `PUT` no tiene tope máximo. Con un valor muy grande el
worker falla al calcular la fecha límite y no envía ningún aviso. El tope de 365
días es solo del frontend.

## Calendario de exámenes

Todo está en `ConfiguracionCalendarioController`, en `api/ConfiguracionCalendario`.
El archivo se llama `CalendarioExamenesController.cs`, pero la clase y la ruta
no. La regla de negocio es un límite de exámenes **por día**, que define Secretaría
Académica. Hoy vale 2 si nunca se configuró. Desde el 10/11/2026 (`bd7b565`) se
cuenta **por año (el curso de la materia) y comisión**: con límite 2, un día puede
tener 2 de Primer Año A, 2 de Primer Año B y 2 de Segundo Año A. Por eso el curso
de una materia se elige de una lista (`GET /api/Materias/cursos`).

Esta sección se relevó el 10/10/2026 contra el código del backend, los endpoints
`modificar` y `eliminar` se volvieron a verificar el 12/10/2026, y se actualizó el
17/10/2026 con el commit `d771acb` ("Calendario completo"). El frontend consume
`estado-mes` y `del-mes` en `/calendario`, para Docente, Secretario y Director, y
`limite-parciales` en `/secretario/limite-parciales`, para Secretario y Director. El
Docente además registra parciales desde `/calendario` con `registrar`,
`tipos-examen` y `mis-materias-docente`, y los reprograma y elimina con `modificar`
y `eliminar`.

Roles desde el 17/10/2026: `limite-parciales` pide Director o Secretario,
`registrar` y `mis-materias-docente` piden Docente, y `del-mes` pide sesión. Siguen
sin `[Authorize]` `estado-mes`, `tipos-examen`, `modificar` y `eliminar`.

> En ese commit se quitó `app.UseAuthorization()` de `Program.cs`, y volvió el mismo
> día con el commit `2a39708` ("fix useauthorization", PR #37 del backend): la
> cadena es `UseCors` → `UseStaticFiles` → `UseAuthentication` → `UseAuthorization`
> → `MapControllers`. Sin esa línea, en .NET 10 `WebApplication` agrega la
> autorización sola pero **antes** de la autenticación, y todo endpoint con
> `[Authorize]` respondería `401` con un token válido. Si vuelve a pasar, es lo
> primero que hay que mirar.

### `GET /api/ConfiguracionCalendario/estado-mes?anio=2026&mes=10`

`mes` va de 1 a 12. Desde el 10/11/2026 acepta además `&idMateria=4&idComision=2`:
la materia y la comisión que se están por cargar. Devuelve `200`:

```json
{
  "limiteDiario": 2,
  "diasOcupados": [
    {
      "fecha": "2026-10-13T00:00:00",
      "cantidadExamenes": 3,
      "limiteAlcanzado": false,
      "porGrupo": [
        { "curso": "Primer Año", "idComision": 1, "comision": "1° A", "cantidadExamenes": 1, "limiteAlcanzado": false },
        { "curso": "Segundo Año", "idComision": 2, "comision": "2° A", "cantidadExamenes": 2, "limiteAlcanzado": true }
      ]
    }
  ]
}
```

- `diasOcupados` trae **solo** los días con al menos un examen. Los demás días del
  mes no vienen: están libres.
- `fecha` es un `DateTime` de .NET serializado sin zona, a medianoche. El frontend
  lo convierte con `desdeFechaSola` para que no se corra un día por la zona
  horaria.
- Sin `idMateria`/`idComision`, `cantidadExamenes` es el total del día y
  `limiteAlcanzado` es `true` si **algún** año y comisión llegó al límite. Con
  ellos, los dos son solo de ese grupo.
- Cuentan los exámenes que cargan los docentes y las mesas pendientes o aceptadas;
  no las mesas que todos rechazaron.
- `porGrupo` trae el detalle de cada año y comisión. El frontend no lo usa.
- Un mes inválido (0 o 13, por ejemplo) responde `500`: el controller arma un
  `DateTime` con el valor sin validarlo.

El frontend arma con eso el modelo `CalendarioDelMes` (`aCalendarioDelMes`, en
`core/examenes/adaptador-estado-mes.ts`): todos los días del mes, en orden, con
`fecha` como `yyyy-MM-dd`, `cantidad` (0 en los que el backend no lista), `limite` y
`estado`. El estado sale de `limiteAlcanzado`: `disponible` sin exámenes,
`completo` si el backend dice que no hay lugar y `ocupado` si no. Ya no se calcula
con `cantidad >= limite`: con varios grupos, un día con 3 exámenes y límite 2 puede
tener lugar. Si `limiteAlcanzado` no viene (un backend anterior), se calcula como
antes (`estadoDelDia`).

`CalendarioExamenesService.calendarioDelMes(anio, mes, opciones, grupo)` manda el
grupo cuando lo hay. Lo usa "Mesas de examen" para revisar el día de la mesa. La
grilla de `/calendario` lo pide sin grupo, así que para el Docente un día
"completo" quiere decir que algún año y comisión llegó, no necesariamente el suyo.

Una entrada de `diasOcupados` que no se puede leer (una fecha inválida, o una
cantidad que no es un entero de 0 para arriba) se descarta y ese día queda
disponible. Si la respuesta entera no se puede leer (`limiteDiario` no es un número
o `diasOcupados` no es una lista) es un error.

### `GET /api/ConfiguracionCalendario/del-mes`

Agregado el 17/10/2026. Con `[Authorize]` y sin rol. Devuelve `200` con los
exámenes del **mes en curso**, ordenados por fecha (`ExamenMesDto`):

```json
[
  {
    "idExamen": 7,
    "materia": "Redes",
    "fecha": "2026-10-20T09:00:00",
    "comision": "Comisión 1° A",
    "tipoExamen": "Parcial",
    "puedeModificar": true
  }
]
```

- **No recibe año ni mes**: usa el `DateTime.Now` del servidor. Para otro mes no hay
  listado.
- No trae los ids de materia, comisión ni tipo, ni quién registró el examen.
- `puedeModificar` (desde el 10/11/2026, `bd7b565`): si quien pide puede
  modificarlo o eliminarlo. Director y Secretario, siempre; un Docente, solo el
  Parcial, Recuperatorio o Final que cargó él (`Examenes.id_docente_creador`). Los
  exámenes anteriores a esa columna no tienen creador: ningún Docente los puede
  tocar.
- Desde el 10/11/2026 las mesas de examen aparecen recién cuando el docente
  convocado las acepta.
- Sin exámenes responde `200` con `[]`.

El frontend lo traduce a `ExamenCalendario` con `aExamenesDelMes`
(`core/examenes/adaptador-examenes-mes.ts`): separa el día y el horario, descarta
un examen que no se puede leer (sin id, o sin fecha con hora) y uno de otro mes.
`puedeModificar` vale solo si llega `true`: sin el campo, nada se puede tocar.
`CalendarioExamenesHttpService.examenesDelMes(anio, mes)` lo pide solo si
`anio`/`mes` son el mes en curso; para cualquier otro devuelve `[]` sin pedir nada.
Con eso, en el mes en curso la grilla lista los parciales y se pueden reprogramar y
eliminar contra la API real.

### `PUT /api/ConfiguracionCalendario/limite-parciales`

Recibe `{ "nuevoLimite": 3 }` y cambia el límite de exámenes por día. Responde
`200`:

```json
{ "message": "El límite de parciales por día se ha actualizado con éxito.", "nuevoLimite": 3 }
```

Con `nuevoLimite` en cero o negativo responde `400` con
`{ "message": "El límite de parciales Diarios debe ser mayor a cero." }`.

- El límite es por día y es un solo número, pero desde el 10/11/2026 se aplica a
  cada año y comisión por separado. Cuenta todos los tipos de examen, no solo los
  parciales, aunque el endpoint se llame así.
- No hay un GET propio. El valor vigente se lee de `limiteDiario` en
  `estado-mes`, que es el mismo en cualquier mes:
  `CalendarioExamenesHttpService.limiteDiario()` pide el mes actual y se queda con
  ese campo.
- El frontend lo usa en la pantalla "Límite de parciales"
  (`/secretario/limite-parciales`), para Secretario y Director. Valida un entero
  entre 1 y 99 antes de enviar y, si el backend rechaza el valor, muestra su
  mensaje. El máximo de 99 es solo del frontend, para atajar un error de tipeo: el
  backend no pone ninguno. El período que nombran los textos ("por día") sale de
  una sola constante, `PERIODO_DEL_LIMITE`: en Jira el límite figura "por semana",
  pero el backend cuenta por día.
- El frontend siempre manda un entero: con `nuevoLimite` ausente el backend lo da
  por válido (ver los pendientes).

### `POST /api/ConfiguracionCalendario/registrar`

Registra un examen. Recibe `CargaExamenDto`:

```json
{ "fecha": "2026-10-13T09:00:00", "idComision": 1, "idMateria": 4, "idTipoExamen": 1 }
```

Responde `200` con `{ "message": "Examen registrado correctamente.", "idExamen": 31 }`
(el id se agregó el 17/10/2026; el frontend no lo usa: después de registrar vuelve a
pedir el mes). Si el día ya alcanzó el límite responde `400` con
`{ "message": "No se puede registrar: ese año y comisión ya tienen el máximo de exámenes permitido para ese día." }`.

Desde el 10/11/2026 (`bd7b565`):

- El límite se cuenta por **año (curso de la materia) + comisión**, no por día
  para todo el instituto. Cuentan también las mesas pendientes o aceptadas.
- Solo acepta los tipos Parcial, Recuperatorio y Final; con otro responde `400`
  `"Tipo de examen no válido. Debe ser Parcial, Recuperatorio o Final."`. Por eso
  el modal del Docente ofrece solo esos tres (`tiposQueRegistraElDocente`).
- Guarda quién lo cargó (`id_docente_creador`): es lo que decide `puedeModificar`.

Desde el 17/10/2026 pide el rol Docente, saca al docente del token y verifica que
dicte esa materia (`docente_materia`); si no, `400` con
`{ "message": "No tiene autorización para registrar exámenes de una materia que no dicta." }`.
No verifica la comisión.

- `fecha` es un `DateTime` de .NET **sin zona y con hora**. El frontend manda la hora
  local tal cual, como texto: `textoFechaYHora(dia, horario)`, en
  `core/examenes/registro-examen.ts`. Nunca `toISOString()`: lo pasa a UTC y corre el
  examen tres horas (un parcial a las 23:30 caería al día siguiente).
- El límite cuenta los exámenes de la misma fecha sin mirar la hora, de cualquier
  tipo, del mismo año (curso de la materia) y la misma comisión.
- No valida que la comisión ni el tipo existan: con ids inválidos responde `500`.
  Tampoco que la fecha no sea pasada. El frontend cuida la fecha (`errorDeDia`: no
  deja registrar en un día anterior a hoy) y ofrece solo las materias del docente de
  la sesión.
- Cómo lo usa el frontend: `CalendarioExamenesService.registrarExamen(...)`.
  `CalendarioExamenesHttpService` arma el cuerpo desde `NuevoExamen` (día, horario y
  los tres ids). Un `4xx` con texto se muestra tal cual (el del límite, por
  ejemplo); un `5xx` o la falta de red, con el mensaje genérico. Va en segundo
  plano, sin el velo global: el botón del modal ya muestra "Guardando…".

### `GET /api/ConfiguracionCalendario/tipos-examen`

Devuelve `200` con `[{ "idTipoExamen": 1, "nombre": "Parcial" }]`. Pide sesión y no
recibe parámetros. Devuelve TODOS los de la base: en algunas hay "Recupetario" (así,
con el error de tipeo), "Parcial Integrador Final" o "Coloquio", y desde el
10/11/2026 el seeder agrega "Parcial", "Recuperatorio" y "Final" si faltan. El
frontend los muestra tal cual vienen en "Mesas de examen", y en el modal del Docente
solo los tres que acepta `registrar`. Si la respuesta no se puede leer (no es una
lista, o un tipo no trae id o nombre) es un error.

### `GET /api/ConfiguracionCalendario/mis-materias-docente`

Con `[Authorize(Roles = "Docente")]`. El docente sale del token (claim
`NameIdentifier`). Devuelve `200` con cada materia en cada comisión que dicta:

```json
[
  {
    "idMateria": 4,
    "nombreMateria": "Programacion II",
    "carrera": "Tecnicatura en Desarrollo de Software",
    "idComision": 1,
    "nombreComision": "Comisión A"
  }
]
```

- Puede ser `[]`: un docente sin materias asignadas.
- Responde `404` con `{ "message": "El usuario no tiene un perfil de docente." }` si el
  usuario no tiene fila en `Docentes`, y `401` con `{ "message": "Token inválido." }` si
  el token no trae el id. Con otro rol responde `403`.
- Una misma materia en dos comisiones son dos elementos. `carrera` puede venir nula.
- El frontend lo traduce a `MateriaDelDocente` (`materia`, `comision`, `carrera`). Un
  `404` con texto se trata como "no tiene materias" y devuelve una lista vacía, igual
  que las mesas asignadas: el modal dice "Todavía no tenés materias asignadas.
  Consultá en Secretaría." Un `404` sin cuerpo (la ruta no existe), un `5xx` o una
  respuesta que no se puede leer son un error, con "Reintentar".

### `PUT /api/ConfiguracionCalendario/modificar/{idExamen}`

Cambia la fecha y la hora de un examen. Recibe `ModificarFechaExamenDto`:

```json
{ "nuevaFecha": "2026-10-20T09:00:00" }
```

Responde `200` con `{ "message": "La fecha del examen se ha modificado correctamente." }`.

- `404` con `{ "message": "No se encontró el examen especificado." }` si el examen
  no existe.
- `400` con
  `{ "message": "No se puede reprogramar. El día ha superado el límite de parciales." }`
  si el día nuevo ya alcanzó el límite. El examen no se cuenta a sí mismo: cambiarle
  solo la hora, o dejarlo en su día, no choca con el límite.
- Solo cambia la fecha y la hora. La materia, la comisión y el tipo no se pueden
  cambiar: por eso "Modificar parcial" los muestra de solo lectura.
- `nuevaFecha` es un `DateTime` de .NET **sin zona y con hora**, igual que `fecha` en
  `registrar`: el frontend la arma con `textoFechaYHora(dia, horario)` y nunca con
  `toISOString()`.
- Pide sesión. Desde el 10/11/2026 (`bd7b565`) un Docente solo puede con el Parcial,
  Recuperatorio o Final que cargó él (`PuedeGestionarExamenAsync`); con otro
  responde `403` sin body. Director y Secretario pueden con todos. No valida que la
  fecha no sea pasada. El frontend cuida la fecha (`errorDeDia`) y solo deja abrir y
  arrastrar los que `del-mes` marca con `puedeModificar` (`parcialesGestionables`).
  Con otro explica por qué no, sin llamar al backend. Antes cruzaba `del-mes` con
  `mis-materias-docente` por el nombre de la materia, que era la regla de `523d05b`.
- Cómo lo usa el frontend: `CalendarioExamenesService.reprogramarExamen(idExamen,
  fechaYHora)`. Un `4xx` con texto se muestra tal cual (el del límite, por ejemplo); un
  `5xx` o la falta de red, con el mensaje genérico. Va en segundo plano, sin el velo
  global. Lo usan dos caminos: el modal "Modificar parcial", donde el rechazo se ve
  dentro del formulario, y el arrastre de un parcial a otro día de la grilla, donde
  se ve arriba de la grilla y el parcial conserva su horario.

### `DELETE /api/ConfiguracionCalendario/eliminar/{idExamen}`

Quita un examen del calendario. No recibe cuerpo. Responde `200` con
`{ "message": "El examen ha sido eliminado del calendario correctamente." }` y `404`
con `{ "message": "No se encontró el examen especificado." }` si no existe.

- Mismo permiso que `modificar`: con un examen que no cargó él, el Docente recibe `403`.
- Desde el 10/11/2026 borra antes las convocatorias de la mesa (`mesa_examen`): una
  mesa con docente asignado ya se puede eliminar.
- Cómo lo usa el frontend: `CalendarioExamenesService.eliminarExamen(idExamen)`, desde
  "Modificar parcial" y recién después de confirmar en el diálogo "¿Eliminar el
  parcial de…?". Mismo criterio de errores que `modificar`.

Los dos necesitan el `idExamen`, que sale de `del-mes`: contra la API real solo se
pueden reprogramar y eliminar los parciales del mes en curso. En los demás meses
la grilla muestra cuántos hay cada día, sin listarlos. Ver `docs/como-probar.md`.

### Pendientes del backend

- `del-mes` solo trae el mes en curso. Debería recibir `anio` y `mes` como
  `estado-mes`, para listar y tocar los parciales de cualquier mes.
- `tipos-examen` devuelve todos los tipos de la base, aunque `registrar` acepte solo
  Parcial, Recuperatorio y Final. El frontend filtra en el modal del Docente; sería
  mejor que el backend los marcara o los filtrara.
- El período del límite no está definido. El backend cuenta por día
  (`limite_parciales_diario`) y en Jira figura "por semana". Si cambia, el frontend
  toca `PERIODO_DEL_LIMITE`, que solo cambia la redacción, y tendría que revisar
  también qué significa "completo" en cada celda.
- `registrar` no valida que la comisión ni el tipo existan (responde `500`), ni que
  la fecha sea futura, ni la comisión del docente. Debería responder `400` con un
  mensaje en cada caso.
- `PUT limite-parciales` valida `nuevoLimite <= 0`, pero `nuevoLimite` es `int?`:
  un cuerpo sin ese campo pasa la validación y deja el límite en `null`, que el
  resto del controller lee como 2. El frontend siempre manda un entero, pero
  cualquier otro cliente puede dejar el límite sin valor.
- `limite-parciales` no tiene máximo. Un valor enorme deja el límite sin efecto.
- Un mes inválido en `estado-mes` debería responder `400` con un mensaje.

## Mesas de examen asignadas al docente

Está en `ConfiguracionController`, en `api/Configuracion`, junto a la frecuencia
de avisos. No es del calendario ni de `ConfiguracionCalendario`: el dato son
mesas de examen, pero la ruta dice "notificaciones" y vive en ese controlador.
Se relevó el 10/10/2026 contra el código del backend.

### `GET /api/Configuracion/mis-notificaciones`

Con `[Authorize(Roles = "Docente")]`. No lleva parámetros: el docente sale del
token (claim `NameIdentifier`). Devuelve `200` con las mesas a las que lo
asignaron y cuya confirmación (`mesa_examen.estado_confirmacion`) sigue en
`Pendiente`:

```json
[
  {
    "idExamen": 1,
    "materia": "Redes",
    "fecha": "2026-11-20T09:00:00",
    "mensaje": "Ha sido asignado a la mesa de Redes el día 20/11/2026 09:00"
  }
]
```

- `fecha` es un `DateTime` de .NET serializado sin zona, **con hora**. El frontend
  la lee en hora local.
- `mensaje` lo arma el backend. El frontend no lo usa: redacta su propio texto,
  con el mismo trato que el resto de la campana.
- Sin mesas pendientes responde `200` con `[]`.
- Responde `404` con `{ "message": "Docente no encontrado." }` si el usuario no
  tiene fila en `Docentes`, y `401` sin cuerpo si el token no trae el id. Con
  otro rol responde `403`.
- **No filtra por fecha.** Devuelve todas las pendientes, también las de
  exámenes que ya pasaron.

Qué hace el frontend con eso:

- `CalendarioExamenesService.mesasAsignadas()` lo pide en segundo plano, sin el velo global.
  `CalendarioExamenesHttpService` lo traduce a `MesaAsignada`. Un `404` es una lista vacía
  (no tiene perfil de docente, así que no tiene mesas); cualquier otro fallo, o
  una respuesta que no se puede leer, es un error.
- Lo consume solo la campana (`CampanaService`) y solo cuando el rol principal de
  la sesión es Docente. Un Director o un Secretario que además es Docente sigue
  viendo los pendientes del instituto.
- `notificacionesPorMesas(...)`, en `core/notificaciones/notificaciones-mesas.ts`,
  arma los avisos. Descarta las mesas de días anteriores a hoy: es una decisión
  del frontend, porque el backend las devuelve todas. Las ordena por fecha, la más
  próxima primero, y escribe "Te asignaron a la mesa de Redes" con el detalle
  "Viernes 20/11/2026, 09:00 h". Cada aviso lleva a `/docente/mesas`, donde se
  acepta o se rechaza (SCRUM-246).
- Los avisos se suman a las novedades del legajo del docente y al número de la
  campana. Si el pedido de las mesas falla, la campana muestra igual el legajo.
- La pantalla "Mis mesas de examen" (`/docente/mesas`) lista las mismas mesas, con
  el mismo corte de "desde hoy" (`mesasPorResponder`).

## Mesas de examen: alta, respuesta y rechazos

Agregado por el backend el 17/10/2026 (commit `d771acb`). Vive en tres
controladores. El frontend lo consume desde `MesasExamenService` (`core/mesas/`),
un dominio aparte del calendario.

### `POST /api/ConfiguracionCalendario/registrar-mesa` (SCRUM-245)

Con `[Authorize(Roles = "Director,Secretario")]`. Recibe `RegistrarMesaDto`:

```json
{ "fecha": "2026-11-20T09:00:00", "idMateria": 4, "idComision": 1, "idTipoExamen": 3, "idDocente": 8 }
```

Crea el examen y la asignación del docente en `Pendiente`, en una transacción.
Responde `200` con `{ message, idExamen }`, `400` con
`{ "message": "El docente seleccionado no existe." }` y `500` con un mensaje si
falla el guardado. No valida la fecha. Desde el 10/11/2026 respeta el límite del
día para el año y la comisión de la mesa (`400` "No se puede registrar la mesa: ese
año y comisión ya tienen el máximo…") y le manda un mail al docente convocado.

El frontend lo usa en "Mesas de examen" (`/mesas-examen`, Director y Secretario).
`erroresDeNuevaMesa` (`core/mesas/nueva-mesa.ts`) exige todo, fecha desde hoy y
horario de 24 h, y `textoFechaYHora` arma la fecha sin zona.

### `POST /api/ConfiguracionCalendario/asignar-docente`

Pide `[Authorize(Roles = "Director,Secretario")]` desde `523d05b` (antes pedía
`Director,Administrador` y dejaba afuera a Secretaría).
Recibe `{ idExamen, idDocente }`, crea la asignación en `Pendiente` y responde `200`
con un mensaje, o `400` si ese docente ya estaba asignado a esa mesa. No valida que
el examen ni el docente existan.

El frontend lo usa para "Reasignar" una mesa rechazada, con Director y Secretario.
Si sale bien, archiva la alerta (`ocultar-alerta-rechazo`).

### `PUT /api/Docente/responder-asignacion` (SCRUM-246)

Con `[Authorize(Roles = "Docente")]`. El docente sale del token. Recibe
`{ "idExamen": 31, "acepta": true }` y pasa la asignación a `Aceptada` o
`Rechazada`. Responde `200` con un mensaje ("Ha aceptada la asignación…", que el
frontend no muestra), `404` si no la encuentra y `400` si ya la respondió.

El frontend lo usa en "Mis mesas de examen" (`/docente/mesas`). Rechazar pide
confirmación, porque no tiene vuelta atrás.

### `GET /api/Configuracion/alertas-rechazos` y `PUT .../ocultar-alerta-rechazo` (SCRUM-247)

Con `[Authorize(Roles = "Director,Secretario")]`. El `GET` devuelve las
asignaciones en `Rechazada`, de la mesa más próxima a la más lejana:

```json
[
  {
    "idExamen": 31,
    "idDocente": 8,
    "docente": "Ana Pérez",
    "materia": "Redes",
    "fecha": "2026-11-20T09:00:00",
    "mensaje": "Asignación rechazada. Requiere reasignar a un nuevo docente de forma urgente."
  }
]
```

El `PUT` recibe `{ idExamen, idDocente }` y pasa la asignación a `Rechazada_Vista`,
que la saca de la lista sin borrar el historial. Responde `404` si no existe y `400`
si no estaba en `Rechazada`.

El frontend las muestra en "Mesas de examen", con "Ya lo vi" y "Reasignar", y en
la campana de Secretario y Director, primero y en rojo
(`notificacionesPorMesasRechazadas`). Si ese pedido falla, la campana muestra
igual los pendientes del instituto.

### Pendientes del backend

- No hay un endpoint que liste las mesas creadas ni sus asignaciones: después de
  crearla, la mesa solo se ve en el calendario del mes en curso (`del-mes`), y
  desde el 10/11/2026 recién cuando el docente la acepta.
- `PUT limite-parciales` no revisa lo cargado: si se baja el límite, los días que
  ya lo superaban quedan así.

Resuelto el 10/11/2026 (`bd7b565`): `registrar-mesa` valida el límite del día (por
año y comisión) y `registrar-mesa` y `asignar-docente` mandan el mail al docente.
Las mesas cuentan para el límite (lo definió Milena el 10/11/2026): el front igual
revisa el día con `calendarioDelMes` para el año y la comisión de la mesa antes de
mandarla (`motivoSinLugar`, `core/mesas/lugar-en-el-dia.ts`), y si no puede
revisarlo no la manda.

## Suplencias docentes

### `PUT /api/Docente/docentes/{idDocente}/suplencia`

Con `[Authorize(Roles = "Director,Secretario")]`. Va con el `idDocente` de la
tabla `Docentes`, no con el `idUsuario`. Recibe `GestionarSuplenciaDto`:

```json
{ "esSuplente": true, "fechaInicio": "2026-11-02T00:00:00", "fechaFin": "2026-11-30T00:00:00" }
```

Las dos fechas son `DateTime?` sin zona. Responde `200` con
`{ message, esSuplente, estadoUsuario }` y `404` con
`{ "message": "No se encontró el registro del docente." }`.

Asignar (`esSuplente: true`) guarda las fechas (sin inicio usa hoy), reactiva la
cuenta si estaba inactiva y le agrega el rol Docente si no lo tenía.

Dar de baja (`esSuplente: false`) le quita el acceso. Si la persona solo tiene el
rol Docente, la cuenta queda inactiva; si tiene más roles, pierde el de Docente y
conserva los otros. Si no tenía fecha de fin, queda la de hoy. El backend no mira
si el docente era suplente: dar de baja a un titular también le quita el acceso.

No es lo mismo que director suplente (`Docentes.director_suplente`), que se marca
en el alta y la edición del usuario (`UsuariosAdmin`).

El frontend lo usa en "Suplencias docentes" (`/suplencias`, Director y
Secretario), con `SuplenciasService` (`core/suplencias/`). El docente sale de
`docentes-disponibles`, que es la lista que trae el `idDocente`. La baja pide
confirmación, y el mensaje final dice si la cuenta quedó inactiva
(`mensajeDeSuplencia`).

### Pendientes del backend

- No hay un `GET` que diga quién es suplente ni con qué fechas: la pantalla no
  puede listar las suplencias vigentes.
- Nada da de baja la suplencia sola cuando llega la fecha de fin.
- La baja debería rechazar a un docente que no es suplente, para no dejar sin
  acceso a un titular por error.

## Contratos de alumnos (SCRUM-227)

Dirección y Secretaría cargan en el perfil del alumno los contratos firmados,
sellados y digitalizados, como el convenio de la beca; el alumno los ve y los
descarga desde su panel y desde "Mis contratos" (`/alumno/contratos`, en su
menú). El frontend usa `ContratosHttpService` contra
`ContratosAlumnoController`; el mock queda solo para desarrollo aislado.

### `POST /api/ContratosAlumno`

Dirección o Secretaría. `multipart/form-data` con `idUsuario` (la persona con
rol Alumno), `nombre` (hasta 100 caracteres) y `archivo` (PDF, hasta 10 MB).
Responde `200` con `{ message, idContrato }`; valida el tipo y contenido del
archivo y que el usuario indicado sea alumno. Un nombre vacío, demasiado largo,
archivo inválido o usuario que no sea alumno responde `400` con `{ message }`.

El archivo se guarda fuera de `wwwroot`, con un nombre generado por el sistema;
el nombre original no se publica ni se usa como ruta.

### `GET /api/ContratosAlumno/alumno/{idUsuario}`

Dirección o Secretaría. Los contratos de un alumno:

```json
[{ "idContrato": 7, "nombre": "Convenio Beca Fundación Encode 2026", "fechaCarga": "2026-10-31T14:20:00" }]
```

`fechaCarga` es un `DateTime` sin zona. Sin contratos responde `[]`, no `404`.

### `GET /api/ContratosAlumno/mis-contratos`

Solo `Alumno`. Los mismos datos, del alumno del token.

### `GET /api/ContratosAlumno/{idContrato}/pdf`

El PDF (`application/pdf`). Dirección, Secretaría o el alumno dueño del contrato;
cualquier otro usuario autenticado recibe `403`. Se sirve por este endpoint y no
desde `/uploads` porque es un documento personal. Si el registro o el archivo no
existe, responde `404`.

El frontend lo usa en "Contratos de alumnos" (`/secretario/contratos`, solo
Dirección y Secretaría), en la tarjeta "Mis contratos" del panel del alumno,
que aparece solo si tiene alguno, y en la pantalla "Mis contratos"
(`/alumno/contratos`), que avisa si el pedido falla y deja reintentar. No hay
un endpoint para borrar contratos.

## Materias y asignaciones

Todo está en `MateriasController`, en `api/Materias`. La pantalla "Materias y
asignaciones" usa todos menos `mis-materias`. Desde el 17/10/2026, `asignar`,
`cargar-materia` y `asignar-alumno` piden Director o Secretario.

- `GET /api/Materias/alumnos-disponibles` (agregado el 14/10/2026):
  `{ data: [{ idAlumno, nombreCompleto }] }`, con el nombre como "Apellido, Nombre
  (Legajo: X)". Sin rol.
- `POST /api/Materias/asignar-alumno` (agregado el 14/10/2026, SCRUM-248), con
  `{ idAlumno, idMateria, idComision }`. Guarda en `alumno_materia`. Responde 400 si
  el alumno, la materia o la comisión no existen, o si ya estaba inscripto en esa
  materia y comisión. Es lo que después ve el alumno en `mis-materias`.

- `GET /api/Materias/docentes-disponibles`:
  `{ data: [{ idDocente, nombreCompleto }] }`.
- `GET /api/Materias/comisiones-disponibles`:
  `{ data: [{ idComision, nombreComision }] }`.
- `POST /api/Materias/asignar`, con `{ idDocente, idMateria, idComision }`.
  Responde 400 si ya está asignada en esa comisión.
- `GET /api/Materias/cursos` (agregado el 10/11/2026): arreglo plano de textos,
  `["Primer Año", "Segundo Año", "Tercer Año"]`. Pide sesión, sin rol. Es el
  desplegable "Curso" del alta de materia.
- `POST /api/Materias/cargar-materia`, con `{ nombreMateria, carrera, curso }`.
  Devuelve `{ message, idMateria }`, o 400 si el nombre se repite. Desde el
  10/11/2026 también responde 400 si el curso no es uno de `cursos`: lo
  normaliza ("1° año" → "Primer Año") porque el límite de exámenes por día se
  cuenta por año y comisión. Por eso el frontend no deja escribirlo.
- `GET /api/Materias/mis-materias`, solo para el rol Alumno. Devuelve un
  arreglo plano, sin `{ data }`: `[{ idMateria, nombre, carrera, curso }]`, con
  las materias en las que el alumno está inscripto. Puede venir vacío, y con
  `404` y un texto suelto si el usuario no tiene perfil de alumno. Lo usa el
  reconocimiento de saberes.
- `GET /api/Materias/materias-disponibles`:
  `{ data: [{ idMateria, nombreMateria }] }`, todas las materias del instituto.

## Reconocimiento de saberes

El alumno envía `POST /api/ReconocimientoSaberes/solicitar`, en multipart, con
`idMateria`, `comentario`, `programaPdf` y `analiticoPdf`. Secretaría ve las
solicitudes con `GET /api/ReconocimientoSaberes/recibirSolicitudReconocimiento`.

El contrato completo está en `contrato-reconocimiento-saberes.md`.

## Endpoints que el frontend no consume

Existen en `main` y no tienen pantalla:

- `GET /api/Justificativos/todos`, que devuelve `{ data: [...] }`: el historial
  completo de justificativos para Secretaría y Dirección.
- `GET /api/Legajos/aprobados`: los documentos aprobados de todo el instituto.
- `GET /api/Legajos/{idUsuario}/faltantes`: los faltantes calculados en el
  servidor. El frontend los calcula con `requeridos-por-rol`. Con el legajo
  completo devuelve un objeto `{ message }` en vez de una lista vacía.
- `GET /api/ReconocimientoSaberes/{id}`: el detalle de una solicitud.

`GET /api/Buscador/global?termino=xx` devuelve
`{ cantidad, data: [{ tipo, titulo, subtitulo, idReferencia }] }` con personas,
materias y justificativos, y a todas las personas las etiqueta como "Docente".
Desde `523d05b` es solo para Director y Secretario, los mismos roles de
`ROLES_QUE_BUSCAN` en el frontend. El frontend tiene el servicio armado, pero la
caja de búsqueda del encabezado sigue deshabilitada.

## La base y el documento del MVP

La base es `Autogestion_Docente`, en SQL Server Express, y no coincide en todo
con el documento descriptivo del MVP:

| El documento dice | La base dice |
| --- | --- |
| Hay una entidad `Documento` | No existe: cada fila de `legajo` es un documento |
| `EstadoDocumento` es un enum | `estado` es `varchar(50) NULL` |
| El alumno tiene número de legajo | Tiene `cohorte` y `estado_academico` |

Como `estado` es texto libre y puede venir nulo, el frontend no puede dar por
hecho que va a recibir solo Pendiente, Aprobado o Rechazado. `insignia-estado`
contempla el caso desconocido.

La tabla `roles_tipos_documentos (id_rol, id_tipo_doc, obligatorio, anual)` es
el denominador de la barra de progreso:

```text
progreso = documentos aprobados de la persona / documentos obligatorios de su rol
```
