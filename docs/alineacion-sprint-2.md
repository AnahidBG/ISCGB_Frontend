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

Dos criterios no se pueden cerrar desde el frontend. El mail al rechazar no
sale, porque la auditoría no llama a `IEmailService`. Y la casilla "Presentado
físicamente" se puede tildar al revisar pero no se guarda: `AuditoriaLegajoDto`
solo recibe `estado` y `comentario`.

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

Por impacto.

1. **`[Authorize(Roles = ...)]`** falta en Usuarios, Legajos, Justificativos,
   ProgramasMateria y Configuracion. Cualquiera con Postman puede aprobar un
   legajo o cambiar la frecuencia de los avisos. Es la regla 5.
2. **`POST /api/UsuariosAdmin/establecer-password`** quedó debajo del
   `[Authorize]` de la clase, sin `[AllowAnonymous]`. Quien crea su contraseña
   desde el mail no tiene sesión y recibe 401.
3. **Mail al rechazar**, en `AuditarLegajo` y `AuditarJustificativo`. Es la
   regla 4.
4. **Motivo en el rechazo de un justificativo.** `AuditarJustificativoDto` solo
   tiene el auditor y el estado.
5. **`presentadoFisico` en `AuditoriaLegajoDto`**, para guardar la casilla de la
   revisión (SCRUM-167 y SCRUM-171).
6. **`GET /api/Usuarios/{id}`** tiene que devolver CUIL, género, afiliación y
   `DirectorSuplente`. Sin el último, editar a un suplente sin volver a tildar
   la casilla le quita la suplencia.
7. **Validar el PDF por contenido** (magic bytes `%PDF-`) en Legajos y
   Justificativos. Hoy se mira el `ContentType`, o nada. Es la regla 1.
8. **Avisos automáticos.** El worker compara contra todos los tipos de
   documento y no contra los obligatorios del rol, y el `PUT` de la frecuencia
   no tiene tope máximo. Detalle en `contrato-api.md`.
9. **Sello del certificado, a verificar.** El archivo está en
   `wwwRoot/Images/sello.png` y el `.csproj` no lo copia a la salida. Si el
   certificado responde 500, es esto. En Linux y Docker, además, las mayúsculas
   de `wwwRoot` e `Images` importan.
10. `POST /api/Auth/crear-usuario-prueba` sigue expuesto sin autenticación.

Ya resueltos: la contraseña inicial del alta, que ahora se crea desde un enlace
enviado por mail; las provincias, con `GET /api/Ubicaciones/paises`; la
reactivación de cuentas; los endpoints de reconocimiento de saberes, y el
`[Authorize]` de `UsuariosAdminController`.

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
