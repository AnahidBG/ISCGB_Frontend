# ISCGB — Sistema de Gestión Documental y Autogestión Académica

Proyecto de Práctica Profesionalizante II: un Sistema ERP web full-stack para la gestión administrativa y académica, automatización de legajos y trazabilidad de documentación del **Instituto Superior Cura Gabriel Brochero**.

> **Estado actual:** MVP en desarrollo. Sprint 1 en curso (ver [Cronograma de Sprints](#cronograma-de-sprints-product-roadmap)).

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Backend** | **.NET 10** — ASP.NET Core Web API |
| **Frontend** | Angular 20+ (standalone, zoneless) |
| **Base de datos** | SQL Server |
| **ORM** | Entity Framework Core |
| **Auth** | JWT Bearer (stateless) + RBAC (roles) |
| **Validaciones** | FluentValidation |
| **Logging** | Serilog |
| **Email** | SMTP (notificaciones automáticas ante rechazo de documentación) |
| **Contenedores / CI-CD** | Docker + GitHub Actions |
| **Gestión de proyecto** | Scrum (Jira) |
| **Diseño UI/UX** | Figma |

> ⚠️ El documento base del MVP menciona .NET 8 SDK como requisito. **El proyecto se desarrolla con .NET 10** — cualquier referencia a .NET 8/9 en documentación anterior debe considerarse desactualizada.

---

## Arquitectura general

El sistema implementa una **Arquitectura Limpia (Clean Architecture)** en el backend y una arquitectura modular basada en componentes en el frontend.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Angular 20+)                 │
│   Standalone Components · Zoneless · UI Reutilizable      │
│   JWT Interceptor · AuthGuards · HTTP Services             │
└───────────────────────┬─────────────────────────────────┘
                         │  HTTP (REST) / JWT Bearer
                         ▼
┌─────────────────────────────────────────────────────────┐
│         Backend (.NET 10 Web API — Clean Architecture)    │
│  [Presentación]    Controllers (Auth, Documentos, ...)    │
│  [Aplicación]       Servicios, DTOs, FluentValidation      │
│  [Dominio]          Entidades (Docente, Alumno, Legajo...) │
│  [Infraestructura]  EF Core, Serilog, EmailService          │
└───────────────────────┬─────────────────────────────────┘
                         │  Entity Framework Core
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      SQL Server                            │
│      (Tablas: Usuarios, Legajos, Roles, Materias, ...)      │
└─────────────────────────────────────────────────────────┘
```

### Backend — capas (Clean Architecture)

El núcleo del sistema es independiente de frameworks externos y de la interfaz de usuario. Las dependencias siempre apuntan **hacia adentro** (Presentación → Aplicación → Dominio), nunca al revés.

```
Presentación/     (Controllers)
  └── AuthController, DocumentosController, UsuariosController,
      LegajosController, JustificativosController, ExamenesController
Aplicación/
  ├── Interfaces/       (IDocumentService, IEmailService, ...)
  ├── Servicios/        (lógica de negocio, casos de uso)
  ├── DTOs/
  └── Validators/       (FluentValidation)
Dominio/
  ├── Entidades/         (Usuario, Alumno, Docente, Legajo, Justificativo, Examen, Materia)
  └── Enums/             (sin dependencias externas)
Infraestructura/
  ├── Persistencia/      (EF Core, DbContext, Migrations)
  ├── Archivos/          (escritura/renombrado de PDFs en disco)
  ├── Email/             (EmailService vía SMTP)
  └── Logging/           (Serilog)
```

**Reglas de capas:**
- `Controllers` **solo** dependen de interfaces de la capa de Aplicación (inyección por constructor). Nunca acceden a EF Core ni a `Dominio` directamente.
- La capa de `Dominio` **no tiene dependencias** de ningún paquete externo ni de otras capas.
- Toda regla de negocio (ver [Reglas de negocio](#reglas-de-negocio-y-convenciones)) vive en la capa de Aplicación, no en los Controllers ni en el Frontend.

### Frontend — estructura modular

Diseñado para soportar múltiples roles sin colisionar componentes entre sí.

```
src/app/
├── core/                   (carga única: singleton)
│   ├── guards/             (auth.guard, role.guard)
│   ├── interceptors/       (jwt.interceptor — funcional)
│   └── services/           (auth.service, user.service)
├── shared/                 (componentes UI reutilizables)
│   ├── components/         (status-badges, data-tables, file-upload)
│   └── utils/               (formateadores de fecha, validadores, etc.)
└── features/                (módulos por lazy loading)
    ├── auth/                (login)
    ├── dashboard-alumno/    (estado de legajo, subida de justificativos)
    ├── dashboard-docente/   (carga de programas, calendario de exámenes)
    ├── dashboard-secretario/ (revisión de legajos, mesas de examen, contratos)
    └── dashboard-director/  (gestión de usuarios y roles, visualización global)
```

- Componentes **standalone** con lazy-loading vía `loadComponent`.
- **Zoneless** (`provideZonelessChangeDetection()`).
- `AuthGuard` protege rutas privadas; `RoleGuard` restringe módulos por rol.
- Los *badges* de estado documental son un componente compartido único (`status-badge`) — nunca se reimplementan por feature (ver [Trazabilidad visual](#gestión-documental-estratégica)).

---

## Modelo de dominio

### Entidades principales

| Entidad | Descripción |
|---------|-------------|
| `Usuario` | Entidad base autenticable (email, password_hash, rol). |
| `Alumno` | Asociada a `Usuario`. Contiene DNI y número de legajo. |
| `Docente` | Asociada a `Usuario`. Contiene CUIL y tipo de título. |
| `Materia` | Asignatura académica vinculada a una carrera. |
| `Legajo` | Documentación formal del docente/alumno (Apto físico, Título, etc.). Tiene fechas de vencimiento y estado. |
| `Justificativo` | Documento que justifica una inasistencia (certificado + nota aclaratoria). |
| `Examen` | Mesa de examen con fecha asignada, vincula `Docente` y `Materia`. |
| `Documento` | Archivo PDF individual dentro de un legajo/justificativo, con estado y trazabilidad. |

### Enumeraciones sugeridas

| Enum | Valores |
|------|---------|
| `RolUsuario` | Director, Secretario, Docente, Alumno |
| `EstadoDocumento` | Pendiente, Aprobado, Rechazado |
| `TipoDocumento` | AptoFisico, AptoPsicologico, Titulo, ProgramaMateria, Justificativo, Contrato, ConvenioBeca, AutorizacionImagenVoz, Otro |

> Nota: el rol **Preceptor** queda unificado con **Secretario** en el alcance del MVP (ver [Fuera de alcance](#fuera-de-alcance)).

### Roles y permisos (RBAC)

| Rol | Permisos |
|-----|----------|
| **Director** | Visualización global de alumnos, docentes y secretarios; alta/baja/modificación de usuarios y roles; revisión y cambio de estado de legajos docentes; carga de justificativos propios. |
| **Secretario** (incluye Preceptor) | Revisión y cambio de estado de legajos docentes y de justificativos; carga de justificativos propios; carga de contratos firmados en perfiles de alumnos; carga de mesas de examen. |
| **Docente** | Autogestión de su legajo (carga y visualización); carga de justificativos de inasistencia; entrega del programa de materia; visualización del calendario de exámenes; descarga de documentación y plantillas institucionales. |
| **Alumno** | Visualización del progreso de su legajo; carga de justificativos de inasistencia; carga de documentación de legajo; solicitud de reconocimiento de saberes; descarga de documentación institucional. |

---

## Alcance funcional del MVP

### Módulo de Alumno

- **Inicio de sesión** → acceso a autogestión del alumno.
- **Módulo Principal**
  - Entrega de certificado de inasistencia y notas aclaratorias.
  - Enlace de redirección al sitio del **SIAADE** (autogestión académica).
  - Autogestión estudiantil: carga de documentación para el alta de legajo.
  - Solicitud de **reconocimiento de saberes**.
  - Descarga de documentos y formatos estudiantiles (Convenio Beca Fundación Encode, Autorización de uso de Imagen y Voz, Apto médico, Apto psicológico).
- **Módulo de Salida**
  - Barra de progreso con el porcentaje de documentación entregada sobre el total requerido.

### Módulo de Docente

- **Inicio de sesión** → acceso a autogestión docente.
- **Módulo Principal**
  - Carga de toda la documentación requerida por institución y ministerio.
  - Visualización y actualización del legajo digital.
  - Carga de justificación de inasistencias (certificado + nota aclaratoria).
  - Entrega del programa de materia.
  - Visualización del calendario de exámenes (evita superposición de parciales).
  - Descarga/enlaces a plataformas externas: ARCA, BDO (Encode), Certificado de servicios.
  - Descarga de plantillas y normas IRAM/ISO.
  - Tutoriales de herramientas de asistencia para profesores.
  - Enlace al "libro de temas" (script generado por el cliente).
- **Módulo de Salida**
  - Barra de progreso de entrega de documentación (igual que en Alumno).

### Módulo de Secretario (incluye funciones de Preceptor)

- **Inicio de sesión** → acceso a autogestión del secretario.
- **Módulo Principal**
  - Revisión y cambio de estado del legajo docente.
  - Revisión y cambio de estado de justificativos de inasistencia.
  - Carga de justificativos propios.
  - Carga de contratos firmados/sellados en perfiles de alumnos.
  - Carga de mesas de examen (dispara notificación al docente).

### Módulo de Director

- **Inicio de sesión** → acceso a autogestión del director.
- **Módulo Principal**
  - Visualización de alumnos, docentes y secretarios en listas separadas.
  - Gestión de usuarios y roles: alta, baja y modificación de accesos.
  - Revisión y cambio de estado del legajo docente.
  - Carga de justificativos propios.

### Fuera de alcance (MVP actual)

- La solicitud de **reconocimiento de saberes** solo cubre el envío desde Alumno hacia Secretario/Director; la gestión posterior entre las partes queda fuera del sistema.
- El rol de **Preceptor** no existe como rol independiente: sus funciones están unificadas dentro de **Secretario**.
- Articulación de contenido y acuerdos de documentos/actas, acuerdos de Formación situada y Talleres del equipo.
- Módulo de actividades extracurriculares o conferencias especiales para alumnos y profesores.

---

## Reglas de negocio y convenciones

### Gestión documental estratégica

- **Formato único:** el sistema restringe la subida de archivos exclusivamente a **`.PDF`**. Cualquier otro formato debe ser rechazado en frontend y validado nuevamente en backend (nunca confiar solo en la validación de cliente).
- **Estandarización de nombres:** el backend **renombra automáticamente** todo archivo subido con el formato:
  ```
  ISCGB_NombreyApellido_NombreDocumento
  ```
  Esta lógica vive en la capa de Infraestructura (servicio de archivos), no en el frontend.
- **Trazabilidad visual (frontend):** los estados de documentos se representan siempre con el mismo componente de *badge*, con semántica estricta:
  - 🟢 **Verde** → Aprobado
  - 🟡 **Amarillo** → Pendiente
  - 🔴 **Rojo** → Rechazado
- **Automatización de notificaciones:** si un documento es **rechazado**, el sistema dispara automáticamente un correo electrónico notificando al usuario correspondiente (vía `IEmailService`).

### Convenciones de código

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Clases y entidades (C#) | `PascalCase` | `UsuarioService`, `LegajoAlumno` |
| Métodos (C#) | `PascalCase` | `AprobarDocumento()` |
| Métodos y variables (TypeScript) | `camelCase` | `obtenerLegajo()`, `fechaVencimiento` |
| Interfaces (C#) | Prefijo `I` + `PascalCase` | `IDocumentService`, `IEmailService` |
| Enums (C#) | `PascalCase`, singular | `EstadoDocumento`, `RolUsuario` |
| Archivos Angular | `kebab-case` | `dashboard-alumno.component.ts` |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/) obligatorio | `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:` |

> Para el detalle ampliado de convenciones pensado para agentes de IA (Claude Code, etc.), ver **`CLAUDE.md`** en la raíz del repositorio.

---

## Requisitos previos

### Backend

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- SQL Server (local o vía Docker)
- Docker Desktop (recomendado, para levantar el entorno estandarizado)

### Frontend

- [Node.js](https://nodejs.org/) (LTS recomendado)
- Angular CLI 20+
- npm (viene con Node)

---

## Setup y ejecución

### Backend

```bash
cd ISCGB_Backend
dotnet restore
dotnet run
```

La API y Swagger estarán disponibles en `https://localhost:5001`.

### Frontend

```bash
cd ISCGB_Frontend
npm install
ng serve
```

La SPA estará disponible en `http://localhost:4200`.

### Docker (entorno estandarizado)

```bash
docker compose up -d
```

---

## Comandos útiles

### Backend

```bash
# Ejecutar API
dotnet run

# Restaurar dependencias
dotnet restore

# Ejecutar tests
dotnet test

# Crear migración
dotnet ef migrations add <NombreMigracion>

# Aplicar migraciones
dotnet ef database update
```

### Frontend

```bash
# Instalar dependencias
npm install

# Desarrollo
ng serve                          # http://localhost:4200

# Tests
ng test

# Build
ng build                          # Producción
ng build --configuration development
```

---

## Testing

- **QA dedicado:** el equipo cuenta con un rol de Tester (QA) responsable del diseño y ejecución de pruebas funcionales — coordinar con este rol antes de dar por cerrada una historia de usuario.
- **Backend:** se recomienda xUnit (o el framework que el equipo defina) + mocks de `IEmailService` e `IDocumentService` para no depender de SMTP ni del filesystem real en los tests.
- **Frontend:** pruebas unitarias sobre servicios y guards (`auth.guard`, `role.guard`) y sobre el componente de *badge* de estado, dado que es un componente compartido crítico.
- **Validación con usuarios:** antes de cerrar un sprint, validar con Secretaría y Dirección que el flujo es más eficiente que el proceso manual actual (ver [Definición de Éxito](#definición-de-éxito)).

---

## Seguridad

- **JWT Bearer (stateless):** autenticación de todos los endpoints privados.
- **RBAC:** control de acceso por rol (`Director`, `Secretario`, `Docente`, `Alumno`) tanto en backend (`[Authorize(Roles = "...")]`) como en frontend (`RoleGuard`).
- **FluentValidation:** toda validación de entrada (incluida la restricción de formato `.PDF`) se valida también en el backend, nunca solo en el cliente.
- **Serilog:** registrar cambios de estado de legajos/justificativos y envíos de notificaciones para trazabilidad y auditoría.

### Notas de seguridad

> **⚠️ Antes de producción:**
> - No commitear credenciales SMTP reales al repositorio (usar `appsettings.Development.json` / variables de entorno / secrets de GitHub Actions).
> - Configurar CORS con la URL real del frontend antes de desplegar.
> - Verificar que los PDFs subidos se validen también por contenido (magic bytes), no solo por extensión.

---

## Dominio de negocio

El sistema centraliza y digitaliza el ciclo completo de gestión documental académico-administrativa:

1. **Autenticación por roles** → Director, Secretario, Docente, Alumno.
2. **Carga digital de documentación** → docentes y alumnos suben sus PDFs desde autogestión.
3. **Estandarización automática** → el backend renombra cada archivo con el formato institucional.
4. **Revisión y validación** → Secretaría y Dirección aprueban o rechazan cada documento.
5. **Trazabilidad visual** → badges verde/amarillo/rojo reflejan el estado en tiempo real.
6. **Notificaciones automáticas** → email ante documentación rechazada o faltante.
7. **Legajos digitales** → reemplazo del legajo físico/planilla por un legajo centralizado y auditable.
8. **Mesas de examen y calendario** → coordinación entre Secretaría y Docentes.

---

## Cronograma de Sprints (Product Roadmap)

| Sprint | Fechas | Entregables principales |
|--------|--------|--------------------------|
| **Sprint 1** | 01/08/2026 – 31/08/2026 | Inicio de sesión · Entrega de justificación de inasistencia · Carga de documentación (Docente) · Entrega del programa en formato determinado (Docente) · Recepción y validación de justificación (Secretario) · Revisión de documentación entregada (Docente) · Autogestión estudiantil |
| **Sprint 2** | 01/09/2026 – 30/09/2026 | Solicitud de certificado de alumno regular (Estudiante) · Gestión de usuarios y roles (Dirección) · Notificación por documentación faltante (Sistema) · Revisión y cambio de estado del legajo docente (Secretario y Director) · Solicitar reconocimiento de saberes |
| **Sprint 3** | 01/10/2026 – 31/10/2026 | Calendario de exámenes parciales y finales (Docente) · Enlace al sitio académico SIAADE mejorado · Visualización de docentes, alumnos y secretarios (Director) · Visualización de alumnos y docentes (Secretario) · Cambio de contraseña |

**Fecha de lanzamiento estimada del MVP:** noviembre de 2026.

---

## Definición de Éxito

**Objetivos de negocio**
- Reducir el tiempo de revisión de documentación manual.
- Reducir el seguimiento mediante planillas y papel.
- Centralizar la documentación en una única plataforma.

**Métricas de producto**
- El 100% de los documentos docentes se cargan mediante el sistema.
- El personal administrativo puede revisar legajos sin utilizar registros externos.
- Las notificaciones se envían correctamente ante documentos pendientes o rechazados.

**Validación con usuarios**
- Secretaría y Dirección consideran que el proceso es más eficiente que el método actual.
- Los docentes pueden identificar fácilmente el estado de su documentación.
- Los alumnos pueden identificar fácilmente el estado de su documentación.

---

## Equipo y recursos

| Integrante | Rol |
|------------|-----|
| Giaquinta, Anahid | Product Owner, Scrum Master y Backend Developer |
| Lupiañe, Agustín | Tester (QA) |
| Perulero, Gonzalo | Diseñador UX/UI y Frontend Developer |
| Previgliano, Milena | Diseñadora UX/UI y Frontend Developer |
| Silva, Angel | Backend Developer |
| Karina Salto | Docente a cargo |

**Responsabilidades por rol:**
- **Product Owner** → gestión de requerimientos, priorización del backlog y comunicación con el cliente.
- **Scrum Master** → facilitación de Scrum, seguimiento de tareas y eliminación de impedimentos.
- **Backend Developer** → desarrollo de API REST, seguridad, lógica de negocio y acceso a datos.
- **Tester (QA)** → diseño y ejecución de pruebas funcionales.
- **Diseñador UX/UI** → diseño de prototipos, validación de experiencia de usuario y consistencia visual.
- **Frontend Developer** → desarrollo de interfaces Angular y experiencia de usuario.

---

## Estructura del repositorio (sugerida)

```
ISCGB/
├── ISCGB-PROJECT.md          ← Este archivo
├── CLAUDE.md                 ← Guía de convenciones para agentes de IA
├── ISCGB_Backend/
│   ├── Presentacion/         ← Controllers
│   ├── Aplicacion/           ← Servicios, DTOs, Validators
│   ├── Dominio/              ← Entidades, Enums
│   ├── Infraestructura/      ← EF Core, Email, Archivos, Logging
│   └── ISCGB_Backend.Tests/
├── ISCGB_Frontend/
│   └── src/app/
│       ├── core/
│       ├── shared/
│       └── features/
└── docs/
    └── Documento_descriptivo_del_MVP.pdf
```

---

## Git

- **Commits:** Conventional Commits obligatorio (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- **Gestión:** Scrum vía Jira — cada tarea/commit debería poder trazarse a una historia de usuario del sprint correspondiente.

---

## Licencia

Proyecto académico de Práctica Profesionalizante II — Instituto Superior Cura Gabriel Brochero (2026). Uso educativo.
