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
los dos con `{ "message": "…" }`. El endpoint no manda mails.

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

- Los dos endpoints de frecuencia no tienen `[Authorize]`: responden sin
  autenticación. En el mismo controlador, `mis-notificaciones` sí exige el rol
  Docente (ver "Mesas de examen asignadas al docente").
- El `PUT` no tiene tope máximo. Con un valor muy grande el worker falla al
  calcular la fecha límite y no envía ningún aviso. El tope de 365 días es solo
  del frontend.
- El worker compara contra todos los tipos de documento, no contra los
  obligatorios del rol, y recorre a todos los usuarios. El mail puede listar
  documentos distintos de los que el frontend muestra como faltantes.

## Calendario de exámenes

Todo está en `ConfiguracionCalendarioController`, en `api/ConfiguracionCalendario`.
El archivo se llama `CalendarioExamenesController.cs`, pero la clase y la ruta
no. La regla de negocio es un límite de exámenes **por día**, único para todo el
instituto, que define Secretaría Académica. Hoy vale 2 si nunca se configuró. No
hay límite por comisión.

Esta sección se relevó el 10/10/2026 contra el código del backend. El frontend
consume `estado-mes` en `/calendario`, para Docente, Secretario y Director, y
`limite-parciales` en `/secretario/limite-parciales`, para Secretario y Director.
El Docente además registra parciales desde `/calendario` con `registrar`,
`tipos-examen` y `mis-materias-docente`. De todos ellos, el backend exige rol solo
en `mis-materias-docente`: lo único que deja afuera al Alumno en el resto es el
`roleGuard` del frontend.

### `GET /api/ConfiguracionCalendario/estado-mes?anio=2026&mes=10`

`mes` va de 1 a 12. Devuelve `200`:

```json
{
  "limiteDiario": 2,
  "diasOcupados": [
    { "fecha": "2026-10-13T00:00:00", "cantidadExamenes": 1, "limiteAlcanzado": false }
  ]
}
```

- `diasOcupados` trae **solo** los días con al menos un examen. Los demás días del
  mes no vienen: están libres.
- `fecha` es un `DateTime` de .NET serializado sin zona, a medianoche. El frontend
  lo convierte con `desdeFechaSola` para que no se corra un día por la zona
  horaria.
- `limiteAlcanzado` lo calcula el backend (`cantidadExamenes >= limiteDiario`). El
  frontend no lo usa: calcula el estado de cada día él mismo con la cantidad y el
  límite (`estadoDelDia`), que es la misma cuenta.
- No hay más campos. No trae qué exámenes son, de qué materia ni a qué hora.
- Un mes inválido (0 o 13, por ejemplo) responde `500`: el controller arma un
  `DateTime` con el valor sin validarlo.

El frontend arma con eso el modelo `CalendarioDelMes` (`aCalendarioDelMes`, en
`core/examenes/adaptador-estado-mes.ts`): todos los días del mes, en orden, con
`fecha` como `yyyy-MM-dd`, `cantidad` (0 en los que el backend no lista), `limite` y
`estado`. El estado sale de `estadoDelDia(cantidad, limite)`: `disponible` sin
parciales, `ocupado` si tiene alguno y falta para el límite, y `completo` si lo
alcanzó. Si la cantidad o el límite no son números válidos, el día queda
`disponible`.

Una entrada de `diasOcupados` que no se puede leer (una fecha inválida, o una
cantidad que no es un entero de 0 para arriba) se descarta y ese día queda
disponible. Si la respuesta entera no se puede leer (`limiteDiario` no es un número
o `diasOcupados` no es una lista) es un error.

### `PUT /api/ConfiguracionCalendario/limite-parciales`

Recibe `{ "nuevoLimite": 3 }` y cambia el límite de exámenes por día. Responde
`200`:

```json
{ "message": "El límite de parciales por día se ha actualizado con éxito.", "nuevoLimite": 3 }
```

Con `nuevoLimite` en cero o negativo responde `400` con
`{ "message": "El límite de parciales Diarios debe ser mayor a cero." }`.

- El límite es por día y único para todo el instituto. Cuenta todos los tipos de
  examen, no solo los parciales, aunque el endpoint se llame así.
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

Responde `200` con `{ "message": "Examen registrado correctamente." }`. **No
devuelve el id del examen**, así que el frontend no puede abrirlo ni listarlo después.
Si el día ya alcanzó el límite responde `400` con
`{ "message": "No se puede registrar. Se ha superado el límite de parciales para ese día." }`.

- `fecha` es un `DateTime` de .NET **sin zona y con hora**. El frontend manda la hora
  local tal cual, como texto: `textoFechaYHora(dia, horario)`, en
  `core/examenes/registro-examen.ts`. Nunca `toISOString()`: lo pasa a UTC y corre el
  examen tres horas (un parcial a las 23:30 caería al día siguiente).
- El límite cuenta los exámenes de la misma fecha sin mirar la hora, de cualquier
  materia, comisión o tipo.
- No valida que la materia, la comisión ni el tipo existan: con ids inválidos
  responde `500`. Tampoco que la fecha no sea pasada, ni que el docente dicte esa
  materia en esa comisión, ni que quien llama sea Docente: no tiene `[Authorize]`.
  El frontend cuida la fecha (`errorDeDia`: no deja registrar en un día anterior a
  hoy) y ofrece solo las materias del docente de la sesión; cualquier otro cliente
  se las puede saltear.
- Cómo lo usa el frontend: `CalendarioExamenesService.registrarExamen(...)`.
  `CalendarioExamenesHttpService` arma el cuerpo desde `NuevoExamen` (día, horario y
  los tres ids). Un `4xx` con texto se muestra tal cual (el del límite, por
  ejemplo); un `5xx` o la falta de red, con el mensaje genérico. Va en segundo
  plano, sin el velo global: el botón del modal ya muestra "Guardando…".

### `GET /api/ConfiguracionCalendario/tipos-examen`

Devuelve `200` con `[{ "idTipoExamen": 1, "nombre": "Parcial" }]`. No exige rol y no
recibe parámetros. Hoy la base tiene cuatro: "Parcial", "Recupetario" (así, con el
error de tipeo), "Parcial Integrador Final" y "Coloquio". El frontend los muestra
tal cual vienen. Si la respuesta no se puede leer (no es una lista, o un tipo
no trae id o nombre) es un error.

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

### Lo que existe y el frontend todavía no consume

- `PUT /api/ConfiguracionCalendario/modificar/{idExamen}` recibe
  `{ nuevaFecha }`. Responde `404` si el examen no existe y `400` si el día nuevo
  ya está completo.
- `DELETE /api/ConfiguracionCalendario/eliminar/{idExamen}`. Responde `404` si el
  examen no existe.

### Pendientes del backend

- No hay un endpoint que liste los exámenes (`idExamen`, materia, comisión y tipo).
  Por eso el calendario dice cuántos hay cada día y no cuáles: no se puede armar
  la agenda del mes ni mostrar la materia, la hora o quién registró cada examen.
  Tampoco se puede saber, en el front, cuáles son "los tuyos". La grilla ya tiene
  dónde dibujarlos: `CalendarioExamenesService.examenesDelMes(...)` devuelve una
  lista vacía contra la API real (`TODO(SCRUM-182)`) y solo el mock trae ejemplos.
- El período del límite no está definido. El backend cuenta por día
  (`limite_parciales_diario`) y en Jira figura "por semana". Si cambia, el frontend
  toca `PERIODO_DEL_LIMITE`, que solo cambia la redacción, y tendría que revisar
  también qué significa "completo" en cada celda.
- `registrar` devuelve solo un mensaje, sin el id del examen creado. Sin el id el
  frontend no puede, por ejemplo, ofrecer "Deshacer" ni abrir el parcial recién
  cargado.
- `registrar` no valida que los ids existan (responde `500`), ni que la fecha sea
  futura, ni que el docente dicte esa materia en esa comisión. Debería responder
  `400` con un mensaje en cada caso.
- Solo `mis-materias-docente` exige rol. El resto no tiene `[Authorize]`: quien
  tenga la dirección puede registrar, mover o borrar exámenes y cambiar el límite
  sin iniciar sesión. En `limite-parciales` la línea está comentada en el código,
  así que hoy solo el `roleGuard` del frontend limita quién cambia el límite.
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
  "Viernes 20/11/2026, 09:00 h". Cada aviso lleva a `/calendario`.
- Los avisos se suman a las novedades del legajo del docente y al número de la
  campana. Si el pedido de las mesas falla, la campana muestra igual el legajo.

Pendientes del backend:

- No hay forma de aceptar ni de rechazar una mesa: la confirmación queda siempre
  en `Pendiente`. Por eso el aviso no se va solo: el frontend lo muestra hasta
  que pasa el día del examen, y como la campana recuerda las leídas solo mientras
  la pestaña sigue abierta (`sessionStorage`), reaparece al abrir otra.
- Tampoco hay un endpoint para dar de alta una mesa, es decir, para asignar un
  docente a un examen. Hoy las mesas se cargan a mano en la base.

## Materias y asignaciones

Todo está en `MateriasController`, en `api/Materias`. La pantalla "Materias y
asignaciones" usa todos menos `mis-materias`.

- `GET /api/Materias/docentes-disponibles`:
  `{ data: [{ idDocente, nombreCompleto }] }`.
- `GET /api/Materias/comisiones-disponibles`:
  `{ data: [{ idComision, nombreComision }] }`.
- `POST /api/Materias/asignar`, con `{ idDocente, idMateria, idComision }`.
  Responde 400 si ya está asignada en esa comisión.
- `POST /api/Materias/cargar-materia`, con `{ nombreMateria, carrera, curso }`.
  Devuelve `{ message, idMateria }`, o 400 si el nombre se repite.
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
