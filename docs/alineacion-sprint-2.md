# Alineación del Sprint 2: frontend, backend y Jira

Sprint de septiembre, del 01/09 al 30/09/2026. Revisado el **06/10/2026**
contra Jira (proyecto SCRUM) y la rama `main` de `ISCGB_Backend` (`f856989`,
PR #29).

El backend no se toca desde el frontend. Lo que falta del otro lado queda
anotado acá.

## Historias del sprint

### SCRUM-16: gestión de usuarios y roles

Subtarea de frontend SCRUM-130. Hecha: alta, modificación, baja y reactivación;
uno o más roles por persona; CUIL, género, afiliación y provincia; director
suplente; el mensaje "El perfil de X ha sido actualizado correctamente"; acceso
denegado con cartel, y vencimiento del token verificado al navegar.

Usa `GET /api/Usuarios`, `GET /api/Usuarios/{id}` y, en `UsuariosAdmin`,
`POST alta`, `PUT modificar/{id}`, `PUT baja/{id}` y `PUT alta/{id}`.

Falta la carrera o especialidad en el perfil: no hay columna ni campo en
`CargaUsuarioDto`.

### SCRUM-19: revisión y cambio de estado del legajo

Subtarea SCRUM-161. Hecha: aprobar o rechazar cada documento, con motivo
obligatorio al rechazar; "Presentado físicamente" a la vista; faltantes y
progreso de la persona revisada; filtro entre docentes y alumnos, y conteos
sobre la versión vigente.

Usa `GET /api/Legajos/resumen-estado`, `GET /api/Legajos/usuario/{id}`,
`PUT /api/Legajos/auditar/{id}` y `GET /api/Legajos/requeridos-por-rol/{idRol}`.

Un criterio no se puede cerrar desde el frontend: el mail al rechazar no sale,
porque la auditoría no llama a `IEmailService`. La casilla "Presentado
físicamente" sí se guarda, con la auditoría, desde que el backend sumó
`presentadoFisico` a `AuditoriaLegajoDto` (06/10/2026). El detalle está en
`contrato-api.md`.

### SCRUM-7: notificación de documentación faltante

Subtarea SCRUM-148. Hecha, con sus cuatro historias de frontend:

- **SCRUM-150.** La campana avisa los rechazos vigentes, los anuales vencidos,
  los obligatorios que faltan y el legajo completo. Los paneles de Docente y
  Alumno tienen la tarjeta "Documentación por entregar", con un "Subir" por
  documento que abre el formulario con ese tipo ya elegido. La tarjeta avisa
  también cuando está cargando, cuando falló y cuando ya no falta nada.
- **SCRUM-151.** Pantalla "Frecuencia de avisos" para Secretaría, en
  `/secretario/frecuencia-avisos`: un entero de 1 a 365 días.
- **SCRUM-152.** Tarjeta "Documentación rechazada" en los dos paneles, con el
  motivo de cada rechazo y "Volver a subir". Un rechazo ya corregido con una
  versión nueva no figura.
- **SCRUM-153.** El aviso de legajo completo aparece en el panel y en la
  campana solo si cada obligatorio está aprobado en su versión vigente, sin
  rechazos ni vencidos.

Usa los endpoints de Legajos y `GET/PUT /api/Configuracion/frecuencia-notificaciones`.
El backend manda los avisos por mail desde el PR #29.

### SCRUM-12: certificado de alumno regular

Subtarea SCRUM-119. Hecho, con y sin horario. Lo genera el backend con el sello
(`GET /api/Certificados/alumno-regular` y `.../alumno-regular-horario`) y tiene
su enlace en el menú.

Los horarios de cursada no son reales: el backend deja las líneas en blanco
para que las complete Preceptoría.

### SCRUM-30: solicitar reconocimiento de saberes

Subtarea SCRUM-172. Hecha: el alumno elige la materia, escribe un comentario y
adjunta los dos PDF (`POST /api/ReconocimientoSaberes/solicitar`), y Secretaría
tiene la bandeja de solicitudes. El contrato está en
`contrato-reconocimiento-saberes.md`.

## Errores del frontend que se corrigieron

- El alta y la edición apuntaban a `POST` y `PUT /api/Usuarios`, que el backend
  nunca implementó. Se alinearon a `UsuariosAdminController`.
- Con el token vencido se seguía navegando y todo fallaba con "error de
  conexión". Ahora `authGuard` y `sesionInterceptor` cierran la sesión y el
  login avisa que venció.
- El acceso denegado mandaba a `/inicio`, sin menú. `roleGuard` vuelve al panel
  propio con un cartel.
- La fecha de nacimiento se precargaba un día antes en Editar Usuario. Se
  arregló con `desdeFechaSola()`, que la lee en hora local.
- El panel del Director mostraba la columna "Legajo" vacía para todos. Ahora se
  cruza con `resumen-estado`.
- Los conteos sumaban versiones viejas y un rechazo ya corregido seguía
  contando. Ahora se mira solo la versión vigente de cada documento.
- Al revisar un legajo ajeno no se veía qué le faltaba entregar a esa persona.
  `MisDocumentos` pide los requeridos de su rol.
- El certificado se armaba en el navegador, sin sello, y la variante con
  horario figuraba como "Próximamente". Ahora se descarga del backend y se quitó
  `jspdf`.
- "Entregar programa" le decía "no sos docente" a todo docente.
  `ProgramasMateriaHttpService` distingue "el endpoint no existe" de "no es
  docente".
- Los campos con solo espacios pasaban la validación del alta. Se validan
  después del `trim()`.

## Pendientes para el backend

Por impacto. Revisada el 10/11/2026 contra el backend de ese día (hasta `bd7b565`,
PR #44).

1. **Solo PDF en Legajos.** Desde `523d05b` se valida el contenido, pero Legajos
   acepta también JPG y PNG, y la regla 1 pide solo PDF.
2. **Nadie aprueba sus propios documentos ni justificativos.** `auditar` no compara
   al auditor con el dueño. Es la regla 5. En justificativos, además, `pendientes`
   no dice de quién es cada uno: un Secretario puede aprobar el suyo, aunque desde
   el 10/11/2026 el Director también los revisa desde su panel.
3. **El motivo del rechazo de un justificativo no se guarda.** Viaja solo en el
   mail; la persona no lo ve en "Mis justificativos". El mail dice "Secretaría
   revisó…" aunque haya rechazado el Director.
4. **Avisos automáticos.** El `PUT` de la frecuencia no tiene tope máximo.
   Detalle en `contrato-api.md`.
5. **Calendario y mesas.** `del-mes` debería recibir año y mes; el período del
   límite es por día y Jira dice por semana (SCRUM-187); `tipos-examen` devuelve
   tipos que `registrar` rechaza. Detalle en `contrato-api.md`.
6. **Sello del certificado, a verificar.** Ahora es `sello.JPG`, pero el código lo
   busca en `wwwroot/images/` y en el repo está en `wwwRoot/Images/`. En Windows
   anda; en Linux y Docker las mayúsculas importan y el certificado respondería 500.
7. **Una clave en el repo.** `appsettings.Development.json` trae `Email:Password`
   (la contraseña de aplicación del correo que manda los mails). Debería ir en una
   variable de entorno o en `dotnet user-secrets`, y esa contraseña habría que
   regenerarla.

Resueltos el 10/11/2026 por la tarde (`d60d93c` y `bd7b565`): el mail al rechazar
un documento o un justificativo, con el motivo (regla 4); el motivo en el rechazo de
un justificativo (`comentario`); `GET /api/Usuarios/{id}` con CUIL, género,
afiliación, suplencia y legajo; el mail de las mesas de examen y el límite en
`registrar-mesa`; el límite por año y comisión, con el curso de la materia de una
lista (`GET /api/Materias/cursos`); y que un docente solo modifique los exámenes que
cargó él (`puedeModificar`).

Resueltos el 10/11/2026 (`523d05b` y `dbb76fa`): la sesión en todos los endpoints
y los roles de Justificativos, Legajos, Usuarios y el buscador; que un Docente
solo modifique o elimine los exámenes de sus materias; el contenido del archivo
(magic bytes) en Legajos, Justificativos, reconocimiento de saberes y contratos;
`asignar-docente` para Secretaría; el borrado de `crear-usuario-prueba`; el
`await` de `DbSeeder.Inicializar`; el límite de intentos en login y recupero, y el
worker de avisos, que ahora compara contra lo que se le pide al rol.

Ya resueltos antes: la contraseña inicial del alta, que ahora se crea desde un enlace
enviado por mail (y `establecer-password` tiene `[AllowAnonymous]`); las
provincias, con `GET /api/Ubicaciones/paises`; la reactivación de cuentas; los
endpoints de reconocimiento de saberes; el `[Authorize]` de
`UsuariosAdminController`; `presentadoFisico` en `AuditoriaLegajoDto` (06/10/2026),
que guarda la casilla de la revisión (SCRUM-167 y SCRUM-171), y, el 17/10/2026, el
listado de exámenes del mes, las mesas de examen, la foto de perfil en el login,
el borrado de datos en "Mi perfil", los roles en Materias, ProgramasMateria,
Configuracion y Docente, y `app.UseAuthorization()`, que se había quitado en
`d771acb` y volvió en `2a39708`.

## Cómo probarlo

```bash
npm install
npm test
npm start         # http://localhost:4200, contra http://localhost:5231
```

Con el backend de `main` funcionan de punta a punta el login, los paneles,
Control de Legajos, la revisión, los certificados, las notificaciones, la
gestión de usuarios y el reconocimiento de saberes. El paso a paso está en
`como-probar.md`.
