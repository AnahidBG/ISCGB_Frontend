# ISCGB — Sistema de Gestión Documental y Autogestión Académica

Proyecto de Práctica Profesionalizante II de la Tecnicatura Superior en Desarrollo de Software (Res. 166/23). Es un ERP web para la gestión administrativa y académica del **Instituto Superior Cura Gabriel Brochero**, de Villa Cura Brochero, Córdoba, una institución impulsada por la fundación de Encode S.A. Automatiza los legajos y deja trazabilidad de la documentación.

El MVP está en desarrollo y el **Sprint 3 está en curso**. Este documento se verificó contra el código el 06/10/2026; si contradice al código o al script de la base, manda el código. Las reglas técnicas con su estado de implementación están en `CLAUDE_GUIDE_ISCGB-v2.md` y las convenciones en `CLAUDE.md`.

## Stack

- Backend: .NET 10, ASP.NET Core Web API (`AutoGestionAPI`).
- Frontend: Angular 21 (standalone, zoneless por defecto, signals) y Tailwind CSS v4.
- Base de datos: SQL Server Express, base `Autogestion_Docente`, con Entity Framework Core 10.
- Autenticación: JWT Bearer de 2 horas, BCrypt y RBAC por nombre de rol.
- PDF: QuestPDF en el backend, para los certificados y el programa de materia.
- Email: `IEmailService` y `EmailService`. Mandan el enlace de alta y los avisos automáticos de documentación faltante. El mail por rechazo todavía no existe.
- Tests: Vitest en el front.
- Contenedores: Docker multi-stage, con nginx para el front y `aspnet:10.0` en el puerto 8080 para el back.
- Repos: GitHub `AnahidBG/ISCGB_Frontend` y `AnahidBG/ISCGB_Backend`, con migración en curso a GitLab `git.icgb.com.ar`.
- Gestión y diseño: Scrum en Jira (`SCRUM-*`) y Figma.

No forman parte del stack FluentValidation, Serilog, jsPDF ni Angular Material, aunque aparecían en documentos anteriores. Las referencias a .NET 8 o Angular 20 de los entregables de junio están desactualizadas.

## Arquitectura

El frontend en Angular habla por HTTP REST, con `Authorization: Bearer`, con una Web API en .NET, que usa EF Core sobre SQL Server.

En el backend los controllers acceden a `TuDbContext` directamente. Los servicios son `DocumentacionService`, `EmailService`, `GeneradorPDFCertificado` y `GeneradorPDFPrograma`, más `NotificadorFaltantesWorker`, que corre una vez por día y manda los avisos de documentación faltante. Es un proyecto único: `Controllers/`, `DTOs/`, `Models/`, `Services/`, `Data/`, `Migrations/` y `wwwroot/uploads/`.

El objetivo documentado en los entregables es Clean Architecture. La lógica nueva conviene ponerla en `Services/`, y el refactor de capas se coordina con el equipo de backend.

En el frontend cada pantalla tiene un contenedor y sus presentacionales. Cada dominio de `core/` tiene un servicio abstracto con una implementación HTTP y, en varios casos, otra simulada; cuál se usa se elige en `app.config.ts`. Las URLs de la API están solo en `core/configuracion/api.ts`.

### Estructura del frontend

```text
src/app/
├── core/       auth · busqueda · carga · certificados · comun · configuracion · justificativos ·
│               legajos · materias · notificaciones · programas-materia · reconocimiento-saberes · usuarios
├── features/   alumno · auth · crear-password · director · docente · inicio · justificativos · legajo ·
│               materias · no-encontrado · proximamente · recuperar-contrasena · secretario · sistema-diseno
└── shared/ui/  aviso-legajo-completo · boton · campo-formulario · dialogo-confirmacion ·
                documentacion-por-entregar · documentos-rechazados · encabezado · estructura-panel ·
                fila-notificacion · icono · insignia-estado · panel-notificaciones · pantalla-carga ·
                progreso-tramite · requisitos-password · tarjeta-metrica · zona-archivo
```

Las rutas, por rol:

- Director: `/director/panel`, `/director/usuarios/nuevo` y `/director/usuarios/:idUsuario/editar`.
- Secretario: `/secretario/panel`, `/secretario/listados`, `/secretario/control-legajos`, `/secretario/reconocimiento-saberes` y `/secretario/frecuencia-avisos`.
- Docente: `/docente/panel` y `/docente/entrega-programa`.
- Alumno: `/alumno/panel`, `/alumno/certificado/regular`, `/alumno/certificado/regular-con-horario` y `/alumno/reconocimiento-saberes`.
- Compartidas: `/legajo/subir-documento`, `/legajo/mis-documentos`, `/legajo/usuario/:idUsuario`, `/materias/asignaciones`, `/justificativos/cargar`, `/calendario`, `/configuracion` e `/inicio`.
- Públicas: `/login`, `/crear-password` y `/recuperar-contrasena`.

### Patrones de diseño

El front aplica de forma explícita Strategy con inversión de dependencias, Adapter, Facade, Chain of Responsibility, Mediator, Observer, tablas por clave en lugar de condicionales y Composite. Las reglas, la deuda conocida y el checklist de PR están en `docs/patrones-frontend.md`.

## Modelo de datos

| Tabla | Para qué |
| --- | --- |
| `Usuarios` | Datos personales, `email`, `dni`, `password_hash`, `estado_usuario` (baja lógica) y token de recuperación |
| `Roles` y `Usuarios_roles` | 1 Director, 2 Secretario, 3 Docente, 4 Alumno. Una persona puede tener varios |
| `Docentes` y `Alumnos` | Extensión 1 a 1 de `Usuarios` |
| `tipos_documentos` y `roles_tipos_documentos` | Qué documentos pide cada rol, con `obligatorio` y `anual` |
| `legajo` | Cada fila es un documento: archivo, estado, auditor, comentario, vencimiento y `presentado_fisico` |
| `Justificativos` | Inasistencias: tipo, rango de fechas, nota, archivo, estado y auditor |
| `reconocimiento_saberes` | Solicitudes de alumnos. Todavía no tiene columna `estado` |
| `configuracion_sistema` | Cada cuántos días se envían los avisos de documentación faltante |
| `materias`, `comision`, `docente_materia`, `alumno_materia` | Oferta académica |
| `programas_materia` y `contenidos` | Programa de materia con el formato ministerial, del que sale el PDF |
| `Examenes`, `tipo_examen`, `mesa_examen` | Exámenes y mesas |
| `PlanesEstudios`, `PlanesMaterias`, `Correlatividades`, `InstanciasParciales`, `NotasParciales`, `RegistrosCursadas` | Estructura académica, pedida por la docente |

El detalle de las columnas está en `CLAUDE_GUIDE_ISCGB-v2.md` §3 y en el script `bbdd/BASE_DATOS_DEFINITIVA_.sql`.

## Roles y permisos

**Director.** Ve las listas de docentes, alumnos y secretarios. Da de alta, de baja y modifica usuarios y roles. Revisa los legajos y cambia su estado. Carga sus propios justificativos y audita las mesas de examen.

**Secretario**, que incluye al Preceptor. Revisa legajos y justificativos, carga los suyos, sube contratos firmados a los perfiles de los alumnos, carga mesas de examen, gestiona usuarios y ve las listas de alumnos y docentes.

**Docente.** Carga y consulta su legajo y ve su progreso. Presenta justificativos y licencias, entrega el programa de materia y usa el calendario de exámenes. Tiene además enlaces (ARCA, BDO/Encode, certificado de servicios), plantillas IRAM/ISO, tutoriales y el libro de temas.

**Alumno.** Carga y consulta su legajo y su progreso, presenta justificativos, pide el certificado de alumno regular y el reconocimiento de saberes, y tiene el enlace al SIAADE y los formatos institucionales para descargar.

Con varios roles se entra al panel de mayor alcance, en el orden Director, Secretario, Docente y Alumno. Nadie aprueba sus propios documentos.

## Alcance funcional del MVP

- Alumno: login, certificados de inasistencia y notas aclaratorias, enlace al SIAADE, carga de la documentación del legajo, solicitud de reconocimiento de saberes, barra de progreso y descarga de formatos (Convenio Beca Fundación Encode, Autorización de uso de Imagen y Voz, Apto médico y Apto psicológico).
- Docente: login, carga y actualización del legajo, justificativos, programa de materia en PDF, calendario de exámenes con un máximo de 2 por fecha y comisión, enlaces externos, plantillas IRAM/ISO, tutoriales, libro de temas y barra de progreso.
- Secretario: login, revisión de legajos y justificativos (aprobar, o rechazar con motivo), justificativos propios, contratos firmados, mesas de examen y gestión de usuarios.
- Director: login, listas por rol, gestión de usuarios y roles, revisión de legajos y justificativos propios.

Queda fuera de alcance la gestión posterior del reconocimiento de saberes, el rol Preceptor independiente, las articulaciones de contenidos y actas, y las actividades extracurriculares.

## Reglas de negocio

Son obligatorias. El estado de implementación de cada una está en `CLAUDE_GUIDE_ISCGB-v2.md` §2.

1. Solo PDF. El front valida el MIME y el back tiene que validar por magic bytes.
2. Renombrado automático en el backend: `ISCGB_NombreyApellido_NombreDocumento(_timestamp).pdf`.
3. Tres estados: Aprobado (verde), Pendiente (amarillo) y Rechazado (rojo), con el componente `insignia-estado`. Todo documento nuevo empieza en Pendiente.
4. El rechazo exige un motivo, de la lista estándar de la institución, y notifica por mail.
5. El progreso del legajo es aprobados sobre obligatorios del rol.
6. La baja de usuarios es lógica.
7. La documentación faltante se avisa con la frecuencia que configura Secretaría.

## Cómo levantarlo

Backend, con .NET 10 SDK y SQL Server:

```bash
cd ISCGB_Backend
dotnet restore
dotnet run            # API en http://localhost:5231, Swagger en /swagger
```

Hay que configurar `ConnectionStrings:DefaultConnection` y `Jwt:Key` en `appsettings`. La base se crea con el script de `bbdd/` o con `dotnet ef database update`.

Frontend:

```bash
cd ISCGB_Frontend
npm install
npm start             # http://localhost:4200
npm test              # Vitest
npm run build
```

Cada repo tiene su `Dockerfile` multi-stage: el front pasa de `node:22-alpine` a `nginx:alpine`, y el back de `dotnet/sdk:10.0` a `dotnet/aspnet:10.0` en el puerto 8080. El despliegue va al servidor compartido del instituto. Faltan el DNS y el CI/CD de GitLab.

## Seguridad: cómo está hoy

El JWT se emite y se valida, pero no todos los endpoints exigen `[Authorize]`. Al 06/10/2026 lo tienen `UsuariosAdmin`, `Certificados`, `ReconocimientoSaberes` y `mis-materias` de `Materias`. `Legajos`, `Justificativos`, `Usuarios`, `ProgramasMateria` y `Configuracion` siguen abiertos: ahí la restricción por rol está solo en el front (`authGuard`, `roleGuard`), y eso no es seguridad. Es un pendiente del backend.

La validación de PDF en el backend está incompleta: falta revisar los magic bytes, y `POST /api/Legajos` no valida el formato.

Las credenciales del correo están escritas en el código (`Services/IEmailService.cs`) y la clave del JWT en `appsettings.json`. Antes de producción tienen que salir del repo.

La sesión va en `sessionStorage`, para que se borre al cerrar la pestaña en una computadora compartida.

El front muestra un mensaje de login genérico para no revelar qué DNI existen. El backend todavía distingue los casos.

Antes de producción falta también CORS con la URL real.

## Cronograma

- **Sprint 1**, del 01/08 al 02/09/2026: login, justificativos, carga de documentación docente, programa de materia, validación de justificativos, revisión de documentación y autogestión estudiantil.
- **Sprint 2**, del 01/09 al 30/09/2026: certificado de alumno regular, gestión de usuarios y roles, notificaciones de faltantes, revisión y cambio de estado de legajos, y reconocimiento de saberes en el front.
- **Sprint 3**, del 01/10 al 31/10/2026, en curso: calendario de exámenes, SIAADE, listados de Director y Secretario, y cambio de contraseña.

Después viene la integración del 01 al 07/11, las correcciones hasta el 10/11 y el despliegue del 11 al 20/11/2026.

## Definición de éxito

Para el instituto: menos tiempo de revisión manual, menos planillas y papel, y la documentación en un solo lugar.

Para el producto: que todos los documentos docentes se carguen por el sistema, que los legajos se revisen sin registros externos y que las notificaciones lleguen.

Para las personas: que Secretaría y Dirección sientan el proceso más ágil, y que docentes y alumnos vean claro el estado de su documentación.

## Equipo

- **Anahid Giaquinta**: Product Owner, Scrum Master y backend.
- **Angel Silva**: backend.
- **Milena Previgliano**: UX/UI y frontend.
- **Gonzalo Perulero**: UX/UI, frontend y DevOps.
- **Agustín Lupiañe**: QA.
- **Karina Salto**: docente a cargo de la práctica.

Por el cliente participan David Martínez, Director, y Fernando, Secretario.

## Git

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Ramas `feature/...`, con PR o MR aprobado por otra persona.
- Cada cambio debería poder rastrearse a una historia `SCRUM-*`.
- Si el cambio modifica un contrato o una regla, la documentación se actualiza en el mismo PR.

## Licencia

Proyecto académico de Práctica Profesionalizante II del Instituto Superior Cura Gabriel Brochero, 2026. Uso educativo.
