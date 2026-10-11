# Cómo probar el sistema, paso a paso

Actualizado el **10/10/2026**.

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
- [ ] "Editar perfil" y "Cambiar foto" están apagados. Es correcto: el backend
      no tiene endpoint para eso.
- [ ] Se cierra tocando afuera o con Escape.
- [ ] "Cerrar sesión" vuelve al login.

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

### Calendario de exámenes

Lo ven los cuatro roles, en "Calendario de Exámenes" del menú lateral. Es de
consulta: registrar, mover o borrar exámenes no está en la pantalla.

Para tener algo que ver, registrá exámenes desde Swagger con
`POST /api/ConfiguracionCalendario/registrar`:
`{ "fecha": "2026-10-13T09:00:00", "idComision": 1, "idMateria": 1, "idTipoExamen": 1 }`.
Los ids tienen que existir en la base.

- [ ] Abre en el mes actual, con el título del mes y el año, la leyenda y la grilla
      de lunes a domingo.
- [ ] El día de hoy tiene el número en negrita y verde.
- [ ] Un día sin exámenes dice "Libre", con la barrita verde.
- [ ] Un día con un examen dice "1 examen" y tiene fondo ámbar.
- [ ] Un día con el límite alcanzado dice "Completo", con fondo rojo suave y el
      candado. Con el límite en 2 son dos exámenes el mismo día.
- [ ] Las flechas pasan al mes anterior y al siguiente, también de diciembre a
      enero. "Hoy" vuelve al mes actual.
- [ ] Los días de relleno, de los meses vecinos, se ven en gris con el nombre del
      mes y sin estado.
- [ ] La nota de abajo nombra el límite que devuelve el backend. Si lo cambiás con
      `PUT /api/ConfiguracionCalendario/limite-parciales`, cambia al recargar.
- [ ] Con el backend apagado muestra el aviso con "Reintentar", y las flechas
      siguen funcionando.
- [ ] A 375 px de ancho no hay scroll horizontal: las celdas muestran la barrita,
      la cantidad en número y el candado, sin la etiqueta.

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
- Editar el perfil y cambiar la foto: el backend ya tiene
  `PUT /api/Usuarios/mi-perfil` y `POST /api/Usuarios/foto-perfil` desde el
  10/10/2026, pero el frontend todavía no tiene la pantalla.
- Recuperar la contraseña: la pantalla existe, pero simula el envío y no manda
  ningún correo.
- El mail al rechazar un documento o un justificativo.
- Del calendario de exámenes solo se puede consultar: registrar, modificar y
  eliminar exámenes, la agenda del mes y la materia de cada examen no están en la
  pantalla. El backend tampoco tiene un listado de exámenes.
- La configuración de la cuenta, que es del Sprint 3.
