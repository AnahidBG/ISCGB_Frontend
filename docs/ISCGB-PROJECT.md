# ISCGB — Sistema de Gestión Documental y Autogestión Académica

Proyecto de Práctica Profesionalizante II (Tecnicatura Superior en Desarrollo de Software, Res. 166/23): un ERP web full-stack para la gestión administrativa y académica, la automatización de legajos y la trazabilidad de la documentación del **Instituto Superior Cura Gabriel Brochero** (Villa Cura Brochero, Córdoba; institución impulsada por la fundación de Encode S.A.).

> **Estado actual (verificado el 03/10/2026):** MVP en desarrollo, **Sprint 3 en curso**. Es un desarrollo que se actualiza constantemente: si este documento contradice al código o al script de BD, **manda el código**. Las reglas técnicas detalladas y su estado de implementación están en `CLAUDE_GUIDE_ISCGB-v2.md`; las convenciones, en `CLAUDE.md`.

---

## Stack tecnológico

| Capa | Tecnología (real) |
|---|---|
| **Backend** | **.NET 10** — ASP.NET Core Web API (`AutoGestionAPI`) |
| **Frontend** | **Angular 21** (standalone, zoneless por defecto, signals) + Tailwind CSS v4 |
| **Base de datos** | SQL Server Express, base `Autogestion_Docente` |
| **ORM** | Entity Framework Core 10 |
| **Auth** | JWT Bearer (2 h) + BCrypt + RBAC por nombre de rol |
| **PDF** | QuestPDF (backend): certificados y programa de materia |
| **Email** | `IEmailService` / `EmailService` (enlace de alta y avisos automáticos de documentación faltante; el mail por rechazo sigue pendiente) |
| **Tests** | Vitest (front) |
| **Contenedores** | Docker multi-stage (nginx para el front; aspnet:10.0 en el puerto 8080 para el back) |
| **Repos** | GitHub `AnahidBG/ISCGB_Frontend` y `AnahidBG/ISCGB_Backend`; migración en curso a GitLab `git.icgb.com.ar` |
| **Gestión / diseño** | Scrum en Jira (`SCRUM-*`) · Figma |

> **No forman parte del stack hoy:** FluentValidation, Serilog, jsPDF ni Angular Material. Aparecían en documentos anteriores. Las referencias a .NET 8 o Angular 20 de los entregables de junio están desactualizadas.

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│ Frontend — Angular 21                                     │
│ core/ (servicios http+mock, guards, interceptors, api.ts) │
│ shared/ui/ · features/ por rol (lazy loadComponent)       │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP REST · Authorization: Bearer
                        ▼
┌──────────────────────────────────────────────────────────┐
│ Backend — .NET 10 Web API (proyecto único AutoGestionAPI) │
│ Controllers/ · DTOs/ · Models/ (TuDbContext) · Services/  │
│ Data/ (DbSeeder) · Migrations/ · wwwroot/uploads/         │
└───────────────────────┬──────────────────────────────────┘
                        │ EF Core
                        ▼
┌──────────────────────────────────────────────────────────┐
│ SQL Server — Autogestion_Docente (script en bbdd/)        │
└──────────────────────────────────────────────────────────┘
```

- **Backend real:** los controllers acceden a `TuDbContext` directamente. Los servicios son `DocumentacionService`, `EmailService`, `GeneradorPDFCertificado` y `GeneradorPDFPrograma`.
- **Backend objetivo** (documentado en los entregables): Clean Architecture (Presentación → Aplicación → Dominio, más Infraestructura). La lógica nueva conviene ponerla en `Services/`. El refactor de capas se coordina con el equipo de backend.
- **Frontend:** patrón contenedor/presentacional. Cada dominio en `core/` tiene un servicio abstracto con implementación HTTP y mock, y se elige cuál usar en `app.config.ts`. Las URLs de la API están solo en `core/configuracion/api.ts`.

### Estructura del frontend (real)
```
src/app/
├── core/       auth · carga · certificados · comun · configuracion · justificativos ·
│               legajos · programas-materia · reconocimiento-saberes · usuarios
├── features/   alumno · auth · crear-password · director · docente · inicio · justificativos ·
│               legajo · no-encontrado · proximamente · recuperar-contrasena · secretario · sistema-diseno
└── shared/ui/  boton · campo-formulario · encabezado · estructura-panel · icono · insignia-estado ·
                pantalla-carga · progreso-tramite · requisitos-password · tarjeta-metrica · zona-archivo
```

**Rutas por rol:** `/director/panel`, `/director/usuarios/nuevo`, `/director/usuarios/:idUsuario/editar`, `/secretario/panel`, `/secretario/control-legajos`, `/docente/panel`, `/docente/entrega-programa`, `/alumno/panel`, `/alumno/certificado/regular`, `/alumno/certificado/regular-con-horario`, `/alumno/reconocimiento-saberes`, `/legajo/subir-documento`, `/legajo/mis-documentos`, `/legajo/usuario/:idUsuario`, `/justificativos/cargar`, `/calendario` y `/configuracion`. Las públicas son `/login`, `/crear-password` y `/recuperar-contrasena`.

### Patrones de diseño (frontend)

El front aplica de forma explícita Strategy + DIP (servicio abstracto con implementación HTTP y mock), Adapter (API → modelos limpios), Facade (servicios de dominio), Chain of Responsibility (interceptores y guards), Mediator (contenedor/presentacional), Observer (signals), tablas por clave en lugar de condicionales y Composite (`shared/ui`). Siguen los principios de encapsular lo que varía, programar contra interfaces, composición sobre herencia y SOLID. Las reglas, la deuda conocida y el checklist de PR están en **`docs/patrones-frontend.md`**.

---

## Modelo de datos (resumen)

| Tabla | Para qué |
|---|---|
| `Usuarios` | Datos personales, `email`, `dni`, `password_hash`, `estado_usuario` (baja lógica) y token de recuperación |
| `Roles` / `Usuarios_roles` | **1 = Director, 2 = Secretario, 3 = Docente, 4 = Alumno**. N:M: una persona puede tener varios roles |
| `Docentes` / `Alumnos` | Extensión 1:1 de `Usuarios` |
| `tipos_documentos` / `roles_tipos_documentos` | Qué documentos pide cada rol (`obligatorio`, `anual`) |
| `legajo` | **Cada fila es un documento:** archivo, estado, auditor, comentario, vencimiento y `presentado_fisico` |
| `Justificativos` | Inasistencias: tipo, rango de fechas, nota, archivo, estado y auditor |
| `reconocimiento_saberes` | Solicitudes de alumnos (todavía sin columna `estado`) |
| `materias`, `comision`, `docente_materia`, `alumno_materia` | Oferta académica |
| `programas_materia` + `contenidos` | Programa de materia con el formato ministerial (genera PDF) |
| `Examenes`, `tipo_examen`, `mesa_examen` | Exámenes y mesas |
| `PlanesEstudios`, `PlanesMaterias`, `Correlatividades`, `InstanciasParciales`, `NotasParciales`, `RegistrosCursadas` | Estructura académica (pedido de la docente) |

El detalle de las columnas está en `CLAUDE_GUIDE_ISCGB-v2.md` §3 y en el script `bbdd/BASE_DATOS_DEFINITIVA_.sql`.

---

## Roles y permisos (RBAC)

| Rol | Permisos |
|---|---|
| **Director** | Listas de docentes, alumnos y secretarios; alta, baja y modificación de usuarios y roles; revisión y cambio de estado de legajos; carga de justificativos propios; auditoría de mesas de examen. |
| **Secretario** (incluye Preceptor) | Revisión de legajos y justificativos; carga de justificativos propios; contratos firmados en los perfiles de alumnos; carga de mesas de examen; gestión de usuarios; listas de alumnos y docentes. |
| **Docente** | Su legajo (carga, visualización y progreso); justificativos y licencias; entrega del programa de materia; calendario de exámenes; enlaces (ARCA, BDO/Encode, certificado de servicios), plantillas IRAM/ISO, tutoriales y libro de temas. |
| **Alumno** | Su legajo y progreso; justificativos; certificado de alumno regular; reconocimiento de saberes; enlace al SIAADE; formatos institucionales para descargar. |

Con varios roles se entra al panel de mayor alcance (Director > Secretario > Docente > Alumno). Nadie aprueba sus propios documentos.

---

## Alcance funcional del MVP

- **Alumno:** login · certificados de inasistencia y notas aclaratorias · enlace al SIAADE · carga de la documentación del legajo · solicitud de reconocimiento de saberes · descarga de formatos (Convenio Beca Fundación Encode, Autorización de uso de Imagen y Voz, Apto médico, Apto psicológico) · barra de progreso.
- **Docente:** login · carga y actualización del legajo · justificativos · programa de materia en PDF · calendario de exámenes (máximo 2 por fecha y comisión) · enlaces externos · plantillas IRAM/ISO · tutoriales · libro de temas · barra de progreso.
- **Secretario:** login · revisión de legajos y justificativos (aprobar, o rechazar con motivo) · justificativos propios · contratos firmados · mesas de examen · gestión de usuarios.
- **Director:** login · listas por rol · gestión de usuarios y roles · revisión de legajos · justificativos propios.

**Fuera de alcance:** la gestión posterior del reconocimiento de saberes, el rol Preceptor independiente, las articulaciones de contenidos y actas, y las actividades extracurriculares.

---

## Reglas de negocio

Son obligatorias. El estado de implementación de cada una está en `CLAUDE_GUIDE_ISCGB-v2.md` §2.

1. Solo PDF: el front valida el MIME y el back debe validar por magic bytes.
2. Renombrado automático en el backend: `ISCGB_NombreyApellido_NombreDocumento(_timestamp).pdf`.
3. Semáforo: Aprobado 🟢 / Pendiente 🟡 / Rechazado 🔴, con el componente `insignia-estado`. Todo documento nuevo empieza en Pendiente.
4. El rechazo exige un motivo (con la lista estándar de la institución) y notifica por mail.
5. Progreso del legajo = aprobados / obligatorios del rol.
6. Baja lógica de usuarios.
7. Notificación de documentación faltante con la frecuencia que configura Secretaría.

---

## Setup y ejecución

### Backend
```bash
cd ISCGB_Backend
dotnet restore
dotnet run            # API en http://localhost:5231 · Swagger en /swagger
```
- Requisitos: .NET 10 SDK y SQL Server.
- Hay que configurar `ConnectionStrings:DefaultConnection` y `Jwt:Key` en `appsettings` (sin credenciales reales en el repo).
- La base se crea con el script de `bbdd/` o con `dotnet ef database update`.

### Frontend
```bash
cd ISCGB_Frontend
npm install
npm start             # http://localhost:4200
npm test              # Vitest
npm run build
```

### Docker
Cada repo tiene su `Dockerfile` multi-stage: front con `node:22-alpine` → `nginx:alpine`, back con `dotnet/sdk:10.0` → `dotnet/aspnet:10.0` en el puerto 8080. El despliegue va al servidor compartido del instituto. DNS y CI/CD de GitLab están pendientes.

---

## Seguridad: estado real y pendientes

- El JWT se emite y se valida (`UseAuthentication`), pero **los endpoints todavía no exigen `[Authorize]`**. Hoy la restricción por rol está solo en el front (`authGuard`, `roleGuard`), y eso no es seguridad real. **Pendiente de backend.**
- La validación de PDF en el backend está incompleta: falta revisar los magic bytes y en `POST /api/Legajos` no se valida el formato.
- La sesión va en `sessionStorage` para que se borre al cerrar la pestaña en computadoras compartidas.
- El front muestra un mensaje de login genérico para no revelar qué DNIs existen (el backend todavía distingue los casos).
- Antes de producción: CORS con la URL real, secretos fuera del repo y SMTP configurado.

---

## Cronograma de Sprints

| Sprint | Fechas | Entregables |
|---|---|---|
| **1** | 01/08 – 02/09/2026 | Login · justificativos · carga de documentación docente · programa de materia · validación de justificativos · revisión de documentación · autogestión estudiantil |
| **2** | 01/09 – 30/09/2026 | Certificado de alumno regular · gestión de usuarios y roles · notificaciones de faltantes · revisión y cambio de estado de legajos · reconocimiento de saberes (front) |
| **3** | 01/10 – 31/10/2026 (en curso) | Calendario de exámenes · SIAADE · listados de Director y Secretario · cambio de contraseña |

Integración del 01 al 07/11, correcciones hasta el 10/11 y despliegue del 11 al 20/11/2026.

---

## Definición de éxito

- **Negocio:** menos tiempo de revisión manual, menos planillas y papel, y la documentación centralizada.
- **Producto:** el 100 % de los documentos docentes se cargan por el sistema, los legajos se revisan sin registros externos y las notificaciones llegan.
- **Usuarios:** Secretaría y Dirección perciben el proceso como más eficiente, y docentes y alumnos ven claramente el estado de su documentación.

---

## Equipo

| Integrante | Rol |
|---|---|
| Giaquinta, Anahid | Product Owner, Scrum Master y Backend |
| Silva, Angel | Backend |
| Previgliano, Milena | UX/UI y Frontend |
| Perulero, Gonzalo | UX/UI, Frontend y DevOps |
| Lupiañe, Agustín | QA |
| Karina Salto | Docente a cargo (PP II) |

Por el cliente: David Martínez (Director) y Fernando (Secretario).

---

## Git

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Ramas `feature/...` con PR o MR aprobado por otra persona.
- Cada cambio debería poder rastrearse a una historia `SCRUM-*`.
- Si el cambio modifica un contrato o una regla, se actualiza la documentación en el mismo PR.

## Licencia

Proyecto académico de Práctica Profesionalizante II, Instituto Superior Cura Gabriel Brochero (2026). Uso educativo.
