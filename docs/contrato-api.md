# Contrato de la API

Relevado el **06/10/2026** contra el código de `ISCGB_Backend` (`main` en
`f856989`, PR #29) y lo que consume el frontend. El backend está a cargo de
Angel Silva.

La dirección base en desarrollo es `http://localhost:5231`.

Describe la API como está hoy, no como debería estar. Los problemas
detectados están junto a cada endpoint.

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

Devuelve `401` con uno de estos tres mensajes:

```json
{ "message": "Contraseña incorrecta." }
{ "message": "DNI no encontrado o cuenta inactiva." }
{ "message": "Debe configurar su contraseña por primera vez usando el enlace enviado a su correo electrónico." }
```

El último sale cuando la cuenta todavía no pasó por `/crear-password`.

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

### `POST /api/Auth/crear-usuario-prueba`

```json
{ "dni": "11111111", "password": "Test1234" }
```

Crea un usuario con rol Director, sin nombre ni apellido, y devuelve
`{ "message": "Usuario de prueba creado con éxito." }`. No pide autenticación.
**No puede llegar a producción.**

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

Al subir un documento, el Docente o el Alumno ve solo el recordatorio de
entregarlo en papel, y `POST /api/Legajos` manda `presentadoFisico` siempre en
`false`.

Al revisar un legajo ajeno (`legajo/usuario/:idUsuario`), el Secretario o el
Director tiene la casilla "Presentado físicamente" en cada documento. Se puede
tildar y no traba el veredicto, pero **no se guarda**: al recargar se pierde.

Es un pendiente del backend. `presentado_fisico` solo se escribe en
`POST /api/Legajos`; `AuditoriaLegajoDto` recibe únicamente `estado` y
`comentario`, y `AuditarLegajo` no toca esa columna. Hoy no hay forma de
ponerlo en `true` desde la aplicación. Lo que hace falta acordar:

```jsonc
// PUT /api/Legajos/auditar/{idLegajo}?idUsuarioAuditor={id}
{ "estado": "Aprobado", "comentario": null, "presentadoFisico": true }
```

con `PresentadoFisico` como `bool?` en el DTO, para que un `null` no pise el
valor, y `[Authorize(Roles = "Director,Secretario")]` en el endpoint.

Cuidado con los datos viejos: las filas que hoy tienen `presentado_fisico = 1`
las tildó la propia persona al subir. No las verificó Secretaría.

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
`features/legajo/mis-documentos/partes/cuadro-rechazo`.

`legajo.comentario` es `varchar(max)` y `AuditoriaLegajoDto.Comentario` no
tiene `[MaxLength]`. Los 7 motivos juntos suman 228 caracteres, así que la
aclaración no lleva `maxlength`. Al ser `varchar` y no `nvarchar`, las tildes y
la ñ se guardan bien con una collation Latin1, pero un emoji se perdería.

El Docente y el Alumno ven el motivo completo en Mis Documentos, en la tarjeta
"Documentación rechazada" del panel y en la campana. Los rechazos viejos, con
motivo libre, se muestran igual.

Dos pendientes del backend:

- `PUT /api/Justificativos/auditar/{id}` recibe
  `AuditarJustificativoDto { idUsuarioAuditor, estado }`, sin `comentario`. El
  motivo del rechazo de un justificativo no tiene a dónde ir. Cuando exista el
  campo, se reusan el cuadro de rechazo y `MOTIVOS_RECHAZO`.
- El mail automático de rechazo. `IEmailService` tiene
  `EnviarAvisoFaltantesAsync` para los avisos de faltantes, pero `AuditarLegajo`
  y `AuditarJustificativo` no envían nada al rechazar.

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

El envío no es inmediato. `NotificadorFaltantesWorker` corre al arrancar el
servidor y después una vez cada 24 horas, así que un cambio rige desde la
próxima pasada.

Pendientes del backend:

- `ConfiguracionController` no tiene `[Authorize]`: los dos endpoints responden
  sin autenticación.
- El `PUT` no tiene tope máximo. Con un valor muy grande el worker falla al
  calcular la fecha límite y no envía ningún aviso. El tope de 365 días es solo
  del frontend.
- El worker compara contra todos los tipos de documento, no contra los
  obligatorios del rol, y recorre a todos los usuarios. El mail puede listar
  documentos distintos de los que el frontend muestra como faltantes.

## Materias y asignaciones

Todo está en `MateriasController`, en `api/Materias`. La pantalla "Materias y
asignaciones" usa los cuatro primeros.

- `GET /api/Materias/docentes-disponibles`:
  `{ data: [{ idDocente, nombreCompleto }] }`.
- `GET /api/Materias/comisiones-disponibles`:
  `{ data: [{ idComision, nombreComision }] }`.
- `POST /api/Materias/asignar`, con `{ idDocente, idMateria, idComision }`.
  Responde 400 si ya está asignada en esa comisión.
- `POST /api/Materias/cargar-materia`, con `{ nombreMateria, carrera, curso }`.
  Devuelve `{ message, idMateria }`, o 400 si el nombre se repite.
- `GET /api/Materias/mis-materias`, solo para el rol Alumno.
- `GET /api/Materias/materias-disponibles`:
  `{ data: [{ idMateria, nombreMateria }] }`. Lo usa el reconocimiento de
  saberes.

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
El frontend tiene el servicio armado, pero la caja de búsqueda del encabezado
sigue deshabilitada.

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
