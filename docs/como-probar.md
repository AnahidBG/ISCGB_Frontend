# Cómo probar el sistema, paso a paso

Actualizado el **11/10/2026**.

Guía para levantar la base, el backend y el frontend, y comprobar que lo
construido funciona. El orden importa: cada paso da por hecho que el anterior
salió bien. Al final está qué mirar si algo falla.

## 1. La base de datos

El backend se conecta a esta base, según `appsettings.json`:

```text
Server=localhost\SQLEXPRESS;Database=Autogestion_Docente;Trusted_Connection=True
```

El servicio SQL Server (SQLEXPRESS) tiene que estar iniciado en Windows y la
base `Autogestion_Docente` tiene que existir. Se crea con el script
`bbdd/BASE_DATOS_DEFINITIVA_.sql`, que está en la carpeta del proyecto y fuera
de los repos, o con `dotnet ef database update`.

Al arrancar, el backend carga solo los roles, las provincias y los tipos de
documento. Lo demás (materias, comisiones y qué documentos se le piden a cada
rol) está en `bbdd/SQLQueryDatos.sql`.

Dos cosas de ese script: son `INSERT` sueltos, así que **correrlo dos veces
duplica los datos**, y asigna los roles a los usuarios con id 1 a 4, que tienen
que existir antes.

### Los usuarios

No hay usuarios cargados de antemano. El primero se crea desde Swagger con
`POST /api/Auth/crear-usuario-prueba`, que lo deja con el rol Director:

```json
{ "dni": "11111111", "password": "Test1234" }
```

Los demás se dan de alta desde el sistema, con "Nuevo Usuario". Cada persona
recibe un mail con el enlace para crear su contraseña.

Lo que no tiene que pasar es que alguien quede sin fila en `Usuarios_roles`. El
login le responde 200 con `roles: []` y no puede entrar a ningún panel.

## 2. El backend solo

Antes de tocar Angular conviene confirmar que la API anda por su cuenta. Si
algo falla acá, no tiene sentido buscarlo en el frontend.

```bash
cd ISCGB_Backend
dotnet run
```

Tiene que decir `Now listening on: http://localhost:5231`. Dejalo corriendo.

En `http://localhost:5231/swagger`, ejecutá `POST /api/Auth/login` con un DNI y
una contraseña que existan. De la respuesta, lo que importa no es el token sino
`roles`:

```json
{
  "token": "eyJ...",
  "usuario": "Dolores Díaz",
  "idUsuario": 5,
  "roles": [{ "idRol": 3, "nombreRol": "Docente" }]
}
```

Si `roles` viene vacío, volvé al punto 1.

Con el `idUsuario` y el `idRol` que te devolvió el login, probá también:

- `GET /api/Usuarios?pagina=1&registrosPorPagina=500`: `{ paginacion, datos }`
  con las personas cargadas.
- `GET /api/Legajos/usuario/{idUsuario}`: los documentos de esa persona.
- `GET /api/Legajos/requeridos-por-rol/{idRol}`: los documentos que se le piden
  a ese rol.
- `GET /api/Justificativos/pendientes`: los justificativos sin revisar.
- `GET /api/Configuracion/frecuencia-notificaciones`: `{ "diasFrecuencia": 7 }`
  si nunca se configuró.
- `GET /api/ConfiguracionCalendario/estado-mes?anio=2026&mes=10`:
  `{ "limiteDiario": 2, "diasOcupados": [...] }`, con solo los días que tienen
  exámenes. Un mes inválido, como `mes=13`, responde 500.
- `GET /api/Configuracion/mis-notificaciones`, con el token de un Docente: las
  mesas de examen que le asignaron y siguen pendientes, `[]` si no tiene ninguna.
  Con otro rol responde 403, y con un usuario sin fila en `Docentes`, 404.

Un 404 en Legajos no es un error: quiere decir que todavía no hay nada, y el
frontend lo trata así.

## 3. El frontend

En otra terminal, sin cerrar la del backend:

```bash
cd ISCGB_Frontend
npm install      # la primera vez, o si cambió package.json
npm start
```

Abrí `http://localhost:4200` e iniciá sesión. Según el rol tenés que caer en
`/director/panel`, `/secretario/panel`, `/docente/panel` o `/alumno/panel`.

Mientras carga se ve el logo animado. Si aparece, la llamada HTTP está saliendo
de verdad.

Si caés en `/inicio`, la sesión no trae roles.

## 4. Qué mirar en cada pantalla

### Panel del Docente

- [ ] El saludo usa el nombre de la persona.
- [ ] Las cuatro tarjetas (totales, aprobados, pendientes y rechazados) coinciden
      con el legajo.
- [ ] Si tiene un documento rechazado, aparece la tarjeta "Documentación
      rechazada" con el motivo, y "Volver a subir" abre el formulario con ese
      tipo ya elegido.
- [ ] "Documentación por entregar" lista los obligatorios que nunca subió.
- [ ] La campana muestra los mismos avisos. Con todo lo obligatorio aprobado,
      aparece el cartel de legajo completo.
- [ ] "Actividad Reciente" lista los documentos del más nuevo al más viejo, cada
      uno con su insignia de estado.

Para ver el estado de error, apagá el backend con el panel abierto y recargá:
tiene que aparecer el aviso con "Reintentar", no una pantalla rota.

### El menú de la persona

- [ ] El círculo con las iniciales, arriba a la derecha, abre el panel.
- [ ] Muestra el nombre completo, el rol y el correo.
- [ ] "Editar perfil" está activo: abre "Mi perfil" (`/perfil`) y cierra el menú.
- [ ] "Cambiar foto" está apagado, con la nota "Cambiar la foto todavía no está
      disponible." Es correcto: el backend guarda la foto pero ningún endpoint la
      devuelve.
- [ ] Se cierra tocando afuera o con Escape.
- [ ] "Cerrar sesión" vuelve al login.

### Mi perfil

Para los cuatro roles, desde "Editar perfil" en el menú de la persona. Hace falta
una persona con algunos datos de contacto cargados y otra sin ninguno; el alta de
usuarios los pide todos, así que una cuenta sin datos se arma desde la base o con
`POST /api/Auth/crear-usuario-prueba`. Para el caso del correo repetido, otra
persona con otro correo.

- [ ] Abre en `/perfil`, con la pestaña "Mi perfil · ISCGB", el título "Mi perfil" y
      la línea "Actualizá tus datos de contacto." Sin sesión, la dirección `/perfil`
      manda al login.
- [ ] Arriba muestra nombre y apellido, DNI con puntos y roles (todos, si tiene
      más de uno), con la aclaración "Estos datos los actualiza Dirección." No se
      pueden editar.
- [ ] El formulario trae lo que hay en la base: compará con
      `GET /api/Usuarios/{idUsuario}` en Swagger. Lo que no tiene cargado aparece
      vacío, y la provincia de nacimiento, elegida en el desplegable.
- [ ] "Guardar cambios" está apagado hasta que algo cambie, y vuelve a apagarse si
      deshacés el cambio.
- [ ] Cambiar un teléfono y guardar: el botón pasa a "Guardando…" y no se puede apretar
      dos veces. Sale el aviso "Tus datos se actualizaron." y el botón vuelve a
      apagarse. Al recargar la página, el valor nuevo sigue ahí.
- [ ] En Network, el `PUT /api/Usuarios/mi-perfil` lleva solo los campos con texto,
      sin espacios de los costados. Un dato que nunca se cargó y sigue vacío no viaja.
- [ ] Vaciar un dato que ya estaba cargado (el teléfono, por ejemplo) y guardar marca
      "Este dato no se puede dejar vacío." y no manda nada. Es por cómo funciona el
      backend: ignora lo vacío, así que no hay forma de borrar un dato.
- [ ] El correo vacío, o uno como `ana@`, marca el error. Un teléfono con letras
      ("llamar a Juan") o de menos de 6 números marca el error.
- [ ] Escribir otra vez después de guardar hace desaparecer el aviso "Tus datos se
      actualizaron."
- [ ] Poner el correo de otra persona muestra, dentro del formulario, "El correo
      electrónico ingresado ya está registrado a nombre de otra persona." El formulario
      conserva lo escrito.
- [ ] Cambiar el correo y guardar actualiza el correo del menú de la persona sin
      volver a iniciar sesión, y sigue ahí al recargar (en Application, Session
      Storage, la clave `iscgb.sesion`).
- [ ] Con el backend apagado, abrir la pantalla muestra el aviso con "Reintentar". Si
      se apaga con la pantalla ya abierta, "Guardar cambios" muestra "No pudimos guardar
      tus datos. Intentá de nuevo en un momento." dentro del formulario.
- [ ] Con Tab los campos se recorren en orden y cada error queda asociado a su campo
      (un lector de pantalla lo lee junto a la etiqueta). A 375 px de ancho no hay
      scroll horizontal y los campos quedan en una sola columna.
- [ ] Una cuenta sin roles (que existe en el sistema pero no tiene permisos) también
      abre la pantalla y dice "Sin rol asignado".

### Subir Documento

Se entra por el botón verde "Nuevo Documento" o por el menú lateral.

- [ ] El desplegable trae los documentos del rol, con "(opcional)" en los que
      no son obligatorios.
- [ ] Si el tipo es anual, aparece el campo de fecha de vencimiento.
- [ ] Al arrastrar un PDF, el archivo aparece con su nombre y su tamaño.
- [ ] **Con un archivo que no sea PDF lo rechaza con un mensaje y no sube nada.**
      Es la regla de negocio 1.
- [ ] El botón "Subir documento" queda apagado hasta completar todo.
- [ ] Después de enviar, el documento aparece en el panel como Pendiente.

Si la pantalla dice "No pudimos saber qué documentos te corresponden", hay una
sesión vieja guardada en el navegador. Cerrá sesión y volvé a entrar.

### Panel del Secretario

- [ ] Lista los justificativos pendientes, con el nombre, el tipo y la fecha.
- [ ] "Ver el comprobante" abre el PDF cuando el justificativo tiene uno.
- [ ] "Aprobar" lo saca de la lista y muestra la confirmación.
- [ ] "Rechazar" avisa además que el correo automático todavía no sale y que hay
      que avisarle a la persona por otro medio.
- [ ] Al recargar, la lista sigue igual: el cambio se guardó en la base.

### Control de Legajos y revisión

- [ ] "Control de Legajos" lista a las personas con sus conteos por estado.
- [ ] "Ver legajo" abre el de esa persona, con lo que le falta entregar.
- [ ] Aprobar pide confirmación. Rechazar exige elegir al menos un motivo.
- [ ] En un documento pendiente, tildar "Presentado físicamente" no guarda nada
      todavía; queda guardado al aprobar o rechazar.
- [ ] En un documento ya aprobado o rechazado, tildar o destildar la casilla se
      guarda en el momento, y al recargar sigue como quedó.

### Frecuencia de avisos

Solo para Secretario, en el menú lateral.

- [ ] Muestra la frecuencia vigente; 7 días si nunca se configuró.
- [ ] Con 0, con 1,5 o con 400 marca el error y no envía nada.
- [ ] Con un valor válido confirma el cambio, y al recargar sigue ahí.
- [ ] Con otro rol, la dirección `/secretario/frecuencia-avisos` no abre.

### Calendario de parciales

Lo ven el Docente, el Secretario y el Director. El Docente lo tiene en "Calendario
de parciales" del menú lateral; Secretaría y Dirección llegan desde "Límite de
parciales", con el enlace "Ver el calendario de parciales". Solo el Docente puede
registrar parciales (ver "Registrar un parcial", más abajo), tocar un día completo
para ver por qué está bloqueado (ver "Fecha bloqueada") y reprogramar, eliminar o
arrastrar uno ya cargado (ver "Reprogramar, eliminar y arrastrar un parcial").

Para tener algo que ver con un Secretario o un Director, registrá parciales con el
Docente o desde Swagger con `POST /api/ConfiguracionCalendario/registrar`:
`{ "fecha": "2026-10-13T09:00:00", "idComision": 1, "idMateria": 1, "idTipoExamen": 1 }`.
Los ids tienen que existir en la base. El backend todavía no lista los exámenes: la
pantalla cuenta cuántos hay cada día, pero no dice de qué materia son.

- [ ] El título de la página es "Calendario de exámenes parciales". Abre en el mes
      actual, con el título del mes y el año ("Octubre 2026"), la leyenda y la grilla
      con los días "Lun Mar Mié Jue Vie Sáb Dom".
- [ ] El día de hoy tiene el número en negrita y verde.
- [ ] Un día sin parciales dice "Libre", con la barrita verde.
- [ ] Un día con un parcial dice "1 parcial" y tiene fondo ámbar. Con el límite
      en 3 o más, un día con dos dice "2 parciales".
- [ ] Un día con el límite alcanzado dice "Completo", con fondo rojo suave y el
      candado. Con el límite en 2 son dos parciales el mismo día.
- [ ] La leyenda tiene tres chips: "Libre", "1 parcial" y "Completo". Con un límite
      mayor a 2 el del medio dice "Con parciales", y con un límite de 1 no hay chip
      del medio.
- [ ] Las flechas pasan al mes anterior y al siguiente, también de diciembre a
      enero. "Hoy" vuelve al mes actual.
- [ ] Los días de relleno, de los meses vecinos, se ven en gris con el nombre del
      mes y sin estado.
- [ ] La nota de abajo nombra el límite que devuelve el backend ("2 parciales por
      día"). Si lo cambiás desde "Límite de parciales", cambia al recargar.
- [ ] Con Secretario o Director, junto a la nota hay un enlace "Cambiar el límite"
      que abre "Límite de parciales". Con el Docente no está.
- [ ] Con el backend apagado muestra el aviso con "Reintentar", y las flechas
      siguen funcionando.
- [ ] A 375 px de ancho no hay scroll horizontal: las celdas muestran la barrita,
      la cantidad en número y el candado, sin la etiqueta.
- [ ] Con Tab se entra a la grilla una sola vez, en el día de hoy. Con las flechas
      se pasa de un día a otro (izquierda y derecha, un día; arriba y abajo, una
      semana) y el día enfocado tiene contorno. Tab saca del calendario.
- [ ] Un lector de pantalla dice cada día como "13 de octubre, 1 de 2 parciales", y
      agrega "completo" en los que alcanzaron el límite.
- [ ] Con Secretario o Director, tocar un día no hace nada: solo el Docente puede
      elegirlos.
- [ ] Un Alumno no tiene el enlace en el menú, y la dirección `/calendario` lo manda
      a su panel con el aviso de acceso denegado.

### Registrar un parcial

Solo para el Docente, desde "Calendario de parciales". Hace falta un Docente con
materias asignadas: filas en `docente_materia` con su materia y su comisión. Para
probar el rechazo por límite, un día con el límite alcanzado (con el límite en 2,
dos parciales el mismo día).

- [ ] Debajo de la grilla dice "Elegí un día disponible para registrar un parcial. Los
      días completos y las fechas pasadas no admiten registros." Con Secretario o
      Director no está.
- [ ] Los días pasados y los completos no se pueden elegir (con clic ni con Enter o
      Espacio) y un lector de pantalla los anuncia como no disponibles. Hoy sí.
- [ ] Al elegir un día se abre "Registrar parcial", con el día debajo del título
      ("Martes 13 de octubre de 2026"). Mientras trae las materias y los tipos
      muestra la espera dentro del modal.
- [ ] "Materia y comisión" es un solo desplegable: cada opción dice la materia y la
      comisión, con la carrera entre paréntesis. Una materia en dos comisiones son
      dos opciones.
- [ ] "Tipo de examen" lista los tipos que devuelve el backend, con sus nombres tal
      cual ("Recupetario" incluido).
- [ ] "Fecha" viene con el día elegido, se puede cambiar y no deja ir antes de hoy.
      "Horario" dice "Horario en formato 24 h.".
- [ ] Guardar con algún campo vacío marca los que faltan y no manda nada (mirá
      Network). Con una fecha anterior a hoy escrita a mano, dice "La fecha no puede
      ser anterior a hoy."
- [ ] Con todo completo, "Guardar" pasa a "Guardando…" y no se puede apretar dos
      veces. En Network, el `POST` a `registrar` sale sin el velo de carga y el cuerpo
      es `{ fecha, idComision, idMateria, idTipoExamen }`, con la fecha como
      `2026-10-13T09:00:00`: la hora que escribiste, sin correrse.
- [ ] Un parcial a las 23:30 queda ese mismo día en la base. Si queda al día
      siguiente, algo está pasando la hora por UTC.
- [ ] Si sale bien, el modal se cierra, aparece "Parcial registrado para el martes 13
      de octubre a las 09:00." y el día cambia de color sin que la grilla desaparezca.
      El foco queda en ese día.
- [ ] Registrar en un día que ya alcanzó el límite (cambiando la fecha en el modal)
      muestra, dentro del formulario, "No se puede registrar. Se ha superado el
      límite de parciales para ese día." El modal sigue abierto, con lo que
      completaste, y se puede probar con otra fecha.
- [ ] Un Docente sin materias asignadas ve "Todavía no tenés materias asignadas.
      Consultá en Secretaría." y no hay formulario.
- [ ] Con el backend apagado el modal muestra el aviso con "Reintentar". Si se apaga
      con el formulario ya abierto, "Guardar" muestra un mensaje genérico dentro del
      formulario y el modal sigue abierto.
- [ ] Accesibilidad del modal: el foco entra al abrirse; Tab y Shift+Tab dan vueltas
      sin salir del modal; Escape y la X lo cierran y el foco vuelve al día elegido;
      mientras está abierto no se puede usar el resto de la página. Mientras guarda no
      se cierra.
- [ ] A 375 px de ancho el modal entra sin scroll horizontal, con "Fecha" y "Horario"
      uno debajo del otro.

### Fecha bloqueada

Con el backend real y el Docente. Hace falta un día con el límite alcanzado (con el
límite en 2, dos parciales el mismo día) que no sea pasado.

- [ ] Tocar ese día, con clic, Enter o Espacio, no abre "Registrar parcial". Aparece
      arriba de la grilla una franja roja suave con borde izquierdo rojo: "20 de
      octubre · Fecha bloqueada" y debajo "Ya se completó el máximo de parciales por
      día. Elegí otra fecha."
- [ ] El día completo sigue en el recorrido de las flechas, y un lector de pantalla lo
      dice como "20 de octubre, 2 de 2 parciales, completo". El aviso se anuncia solo
      cuando aparece.
- [ ] El aviso desaparece al pasar de mes, al elegir un día disponible (que abre el
      registro) y al abrir cualquier modal.
- [ ] Un día completo que ya pasó no hace nada.
- [ ] Con Secretario o Director, tocar un día completo no muestra el aviso: para ellos
      el calendario es de consulta.

### Reprogramar, eliminar y arrastrar un parcial

Solo para el Docente. El backend todavía no tiene un endpoint que liste los exámenes,
así que contra la API real la grilla no muestra ningún parcial y esto no se puede ver.
Se prueba con el servicio simulado: en `src/app/app.config.ts` cambiá
`CalendarioExamenesHttpService` por `CalendarioExamenesMockService` en el `provide` de
`CalendarioExamenesService` (y su `import`). El simulado trae cuatro parciales por mes,
los días 5, 12 (dos, con el límite en 2 ese día queda completo) y 21, y lo que muevas
o borres se queda hasta que recargues la página. Los endpoints reales se pueden probar
a mano en Swagger con el id de un examen de la base: `PUT .../modificar/{id}` y
`DELETE .../eliminar/{id}`.

- [ ] Cada parcial aparece en su día con el nombre de la materia. Con Secretario o
      Director no abre nada ni se arrastra.
- [ ] Con el Docente, tocar un parcial abre "Modificar parcial", con el día debajo del
      título. Arriba muestra la materia, la comisión y el tipo, de solo lectura, y
      abajo "Fecha" y "Horario" con los del parcial.
- [ ] "Guardar" está apagado mientras no cambies nada. Con una fecha anterior a hoy no
      guarda y dice por qué.
- [ ] Cambiar la fecha o el horario y guardar cierra el modal, avisa "Parcial
      reprogramado para el miércoles 14 de octubre a las 09:00." y el foco queda en el
      día nuevo. Si lo pasaste a otro mes, queda en el día donde estaba.
- [ ] Pasarlo a un día completo (el 12) muestra, dentro del formulario, "No se puede
      reprogramar. El día ha superado el límite de parciales." El modal sigue abierto.
      Cambiarle solo la hora a uno de los dos del 12 sí se puede.
- [ ] "Eliminar parcial" pide confirmación: "¿Eliminar el parcial de Matemática del
      martes 12 de octubre?". "Cancelar" y Escape cierran la pregunta y dejan el modal
      abierto, con el foco otra vez en "Eliminar parcial". "Eliminar" lo borra, avisa
      "Parcial de Matemática del martes 12 de octubre eliminado." y el día cambia de
      color.
- [ ] Con el mouse, un parcial se arrastra a otro día. Mientras lo llevás, los días
      donde se puede soltar tienen un contorno verde y el que está bajo el puntero se
      ilumina. Soltarlo en un día disponible lo mueve y conserva su horario, y aparece
      el mismo aviso verde.
- [ ] Soltarlo en el mismo día, en un día pasado o en uno completo no hace nada. Un
      parcial de un día pasado no se arrastra.
- [ ] Si el backend rechaza el movimiento, aparece arriba de la grilla "No se pudo mover
      el parcial" con su motivo.
- [ ] Con teclado: Tab llega al parcial desde el día, Enter abre "Modificar parcial" y ahí
      se cambia la fecha. El arrastre es solo para el mouse.

### Límite de parciales

Para Secretario y Director, en "Límite de parciales" del menú lateral. Es el número
que usa el calendario para marcar un día como "Completo". Debajo del formulario hay
un enlace "Ver el calendario de parciales".

- [ ] Muestra el límite vigente; 2 si nunca se configuró.
- [ ] El botón "Guardar" queda apagado mientras el valor no cambie.
- [ ] Con el campo vacío, con 0, con 1,5 o con 100 marca el error y no envía nada.
- [ ] Con un valor válido confirma "Límite actualizado: 3 parciales por día.", con
      "1 parcial" en singular, y al recargar sigue ahí.
- [ ] En "Calendario de parciales", la nota de abajo y la leyenda nombran el límite
      nuevo, y los días que lo alcanzan dicen "Completo".
- [ ] Con el backend apagado muestra el aviso con "Reintentar".
- [ ] Con el Docente o el Alumno, la dirección `/secretario/limite-parciales` no abre.

### Mesas de examen en la campana del Docente

Las mesas todavía no se pueden dar de alta desde el sistema ni desde la API: hoy
se cargan en la base. Hace falta un examen con fecha futura (el del calendario, por
ejemplo) y la fila del docente en `Docentes`:

```sql
SELECT id_docente FROM Docentes WHERE id_usuario = 5;  -- el idUsuario del login

INSERT INTO mesa_examen (id_examen, id_docente, estado_confirmacion)
VALUES (1, 1, 'Pendiente');
```

La columna `estado_confirmacion` la crea la migración `SincronizacionManual`
(`dotnet ef database update`). El script `BASE_DATOS_DEFINITIVA_.sql` no la tiene.

- [ ] Con ese Docente, la campana suma el aviso "Te asignaron a la mesa de" con el
      nombre de la materia y el detalle "Viernes 20/11/2026, 09:00 h" (día de la
      semana, fecha y hora de 24 h).
- [ ] El número de la campana cuenta ese aviso además de los del legajo, y el aviso
      va después de ellos.
- [ ] Al tocarlo abre "Calendario de parciales".
- [ ] Una mesa de un examen de una fecha anterior a hoy no aparece. La de hoy sí,
      aunque la hora ya haya pasado.
- [ ] Con varias mesas, la más próxima está primero.
- [ ] Marcarlo como leído lo saca de la campana hasta que se cierra la pestaña.
- [ ] En Network, el pedido a `mis-notificaciones` sale sin el velo de carga.
- [ ] Un Alumno, un Secretario o un Director no ven este aviso. Tampoco un Director
      que además es Docente: sigue viendo los pendientes del instituto.

### Panel del Director

- [ ] Lista a las personas del instituto con sus roles y el estado de su legajo.
- [ ] Quien tiene dos roles aparece con los dos.
- [ ] Si el Director además es Docente, el menú tiene "Entregar programa de
      materia".

## Si algo falla

Abrí siempre F12, pestaña Network, mientras probás. Ahí se ve cada llamada, su
código de respuesta y lo que devolvió. La mayoría de los "no anda" se resuelven
mirando si la llamada salió y qué contestó.

- El login dice que el DNI o la contraseña no son correctos y los datos están
  bien: la persona no está en la base, o tiene `estado_usuario` en 0.
- Entrás, pero caés siempre en `/inicio`: falta su fila en `Usuarios_roles`.
- "No pudimos conectarnos con el servidor": el backend no está levantado, o hay
  un error de CORS. En Network se ven distintos.
- Errores de CORS en la consola: el backend tiene que estar en el puerto 5231 y
  el frontend en el 4200. La política está atada a esos dos.
- El desplegable de tipos de documento sale vacío: falta cargar
  `roles_tipos_documentos` para ese rol.
- El enlace para crear la contraseña responde 401: el backend que corre es
  anterior al 10/10/2026. Desde ese día `establecer-password` no pide sesión.
- El desplegable de materias de Reconocimiento de saberes sale vacío: ese alumno
  no tiene filas en `alumno_materia`. Hoy se cargan a mano en la base; ni el alta
  de usuarios ni "Materias y asignaciones" las crean.
- La bandeja de Secretaría no muestra una solicitud de reconocimiento que está en
  la base: solo lista las que no tienen docente asignado (`id_docente` en NULL).
- `npm start` no compila: suele ser un import mal escrito después de mover
  archivos. El mensaje dice el archivo y la línea.

## Lo que todavía no se puede probar

No está roto: no existe.

- El buscador de la barra superior está deshabilitado.
- Cambiar la foto de perfil: el backend ya tiene `POST /api/Usuarios/foto-perfil`
  desde el 10/10/2026 y la guarda, pero ningún endpoint la devuelve, así que el
  sistema no tiene cómo mostrarla. "Cambiar foto" sigue apagado en el menú de la
  persona.
- Editar en "Mi perfil" el género y la afiliación de emergencia: el backend los
  acepta, pero `GET /api/Usuarios/{id}` no los devuelve, y la pantalla no los
  ofrece. El nombre, el apellido, el DNI y los roles los cambia Dirección.
- Recuperar la contraseña: la pantalla existe, pero simula el envío y no manda
  ningún correo.
- El mail al rechazar un documento o un justificativo.
- Del calendario de parciales, con el backend real, abrir, reprogramar, eliminar o
  arrastrar un parcial ya cargado: las pantallas están, pero el backend no tiene un
  listado de exámenes, así que la grilla no muestra la materia de cada parcial ni
  hay uno que tocar. Se ven con el servicio simulado (ver "Reprogramar, eliminar y
  arrastrar un parcial").
- Aceptar o rechazar una mesa de examen, y darla de alta. La campana del Docente
  avisa las mesas asignadas, pero el backend no tiene endpoints para responderlas.
- La configuración de la cuenta, que es del Sprint 3.
