# CLAUDE.md

Contexto para Claude Code (u otro agente de IA) que trabaje sobre **ISCGB — Sistema de Gestión Documental y Autogestión Académica**. Leelo antes de generar o modificar código.

> **Desarrollo en curso.** Este archivo se verificó contra el código el **03/10/2026**. El proyecto cambia todas las semanas: **si algo de acá contradice al código o al script de BD, manda el código.** Avisá la diferencia y actualizá este archivo en el mismo cambio.

- **Contexto funcional** (alcance, roles, sprints, stack, seguridad): `docs/ISCGB-PROJECT.md`.
- **Guía técnica completa** (reglas con su estado de implementación, BD, contrato de API) y **referencia de los documentos de Drive**: `CLAUDE_GUIDE_ISCGB-v2.md` y `referencia-documentacion-drive.md`, en la carpeta `Claude/` del proyecto (fuera de este repo) y en el Project de claude.ai.
- **Patrones de diseño del front** (obligatorios): `docs/patrones-frontend.md`.
- **Contrato de API y verificaciones:** `docs/contrato-api.md`, `docs/verificacion-backend.md` y la fuente de verdad `src/app/core/configuracion/api.ts`.

---

## Resumen

ERP web que digitaliza los legajos y la documentación del Instituto Superior Cura Gabriel Brochero. Tiene cuatro roles (Director, Secretario, Docente, Alumno), carga de PDFs, revisión y aprobación, y notificaciones.

**Stack real:**
- **Frontend:** Angular 21 (standalone, zoneless por defecto), Tailwind v4 y Vitest.
- **Backend:** .NET 10 Web API (`AutoGestionAPI`, proyecto único), EF Core sobre SQL Server (`Autogestion_Docente`), JWT, BCrypt, QuestPDF y Swagger.
- **Infraestructura:** Docker; GitHub `AnahidBG/*` con migración en curso a GitLab `git.icgb.com.ar`.

> No generes código ni setup para .NET 8/9 ni para Angular < 21. No agregues FluentValidation, Serilog, jsPDF ni Angular Material sin acordarlo con el equipo: hoy no están.

---

## Datos que más se confunden

| Dato | Valor vigente | Dónde verificarlo |
|---|---|---|
| IDs de rol | **1 = Director, 2 = Secretario, 3 = Docente, 4 = Alumno** | `core/auth/modelos/rol.ts` (`ID_ROL`), tabla `Roles` |
| Rol en el JWT | Claim `role` con el **nombre** ("Docente"), uno por rol | `AuthController.GenerarJwtToken` |
| Roles en el login | Vienen en el body: `roles: [{ idRol, nombreRol }]`. El front los toma de ahí. | `core/auth/auth-http.service.ts` |
| Badge de estado | `insignia-estado` en `shared/ui/` | `shared/ui/insignia-estado/` |
| Sesión | `sessionStorage`, clave `iscgb.sesion` | `auth-http.service.ts` |
| URLs de la API | Solo en `core/configuracion/api.ts` | — |

---

## Convenciones de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Clases y entidades (C#) | `PascalCase` | `UsuarioService`, `JustificativoInasistencia` |
| Interfaces (C#) | `I` + `PascalCase` | `IDocumentacionService`, `IEmailService` |
| Métodos y propiedades (C#) | `PascalCase` | `AprobarDocumento()`, `FechaVencimiento` |
| Variables y parámetros (C#) | `camelCase` | `documentoActual` |
| Métodos y variables (TS) | `camelCase` | `obtenerLegajo()` |
| Clases e interfaces (TS) | `PascalCase` | `AuthService`, `Sesion` |
| Archivos Angular | `kebab-case`, **sin** sufijo `.component` | `panel-alumno.ts` + `panel-alumno.html`, `role.guard.ts` |
| Rutas | `kebab-case`, agrupadas por rol | `/director/panel`, `/legajo/mis-documentos` |

- Código, nombres y comentarios **en español**.
- No mezcles convenciones dentro de un archivo. Si un archivo existente usa otra, seguí la suya y avisá en vez de reescribirlo.

---

## Reglas de negocio (no negociables)

Varias reglas **todavía no están implementadas en el backend**. El estado detallado está en `CLAUDE_GUIDE_ISCGB-v2.md` §2. Que una regla figure acá no significa que ya funcione.

1. **Solo PDF.** El front valida el MIME; el back debe validar por magic bytes. *Hoy el back no lo hace en legajos y en justificativos solo mira el ContentType.*
2. **Renombrado** `ISCGB_NombreyApellido_NombreDocumento.pdf` en el backend. El nombre original nunca se persiste. *Hoy se hace en los controllers y le agrega un timestamp.*
3. **Tres estados:** Aprobado 🟢 / Pendiente 🟡 / Rechazado 🔴, siempre con el componente `insignia-estado`. `estado` es `varchar NULL`: los valores nulos o desconocidos se muestran con un estado por defecto.
4. **Rechazo:** el motivo es obligatorio (con las opciones estándar de la institución) y se envía un mail automático vía `IEmailService`. *El mail de rechazo no existe todavía en el back.*
5. **RBAC:** cuatro roles; **Preceptor está dentro de Secretario** (no crear ese rol). Hace falta `[Authorize(Roles=...)]` en el back **y** `roleGuard` en el front. *El back hoy no exige `[Authorize]`.* Nadie aprueba sus propios documentos.

Si tu cambio toca un flujo afectado por una regla pendiente, implementala o dejalo explícito en el PR. No la des por cubierta.

---

## Arquitectura: dónde va cada cosa

### Frontend
```
core/       servicios por dominio (abstracto + *-http.service.ts + *-mock.service.ts), guards,
            interceptors, configuracion/api.ts
shared/ui/  componentes reutilizables entre roles (insignia-estado, zona-archivo, estructura-panel…)
features/   pantallas por rol y por trámite, lazy-loaded con loadComponent
```
- Siempre standalone (sin `NgModule`), con **signals** y `OnPush`. Angular 21 es zoneless por defecto: no asumas Zone.js.
- Patrón contenedor/presentacional: solo el contenedor inyecta servicios; los presentacionales van en `partes/`.
- Una feature no importa componentes de otra feature. Lo compartido va a `shared/`.
- La respuesta cruda de la API se traduce una sola vez a un modelo limpio en `core/` (ejemplo: `RespuestaLogin` → `Sesion`).

### Backend
- **Estado real:** proyecto único (`Controllers/`, `DTOs/`, `Models/`, `Services/`, `Data/`, `Migrations/`).
- **Objetivo documentado:** Clean Architecture. Las reglas de negocio nuevas conviene ponerlas en `Services/` y no sumar más lógica a los controllers. Un refactor de capas se coordina con backend; no se hace de paso.

---

## Patrones de diseño (frontend): obligatorios

El detalle completo, con ejemplos del código, está en **`docs/patrones-frontend.md`** (base: *Sumérgete en los Patrones de Diseño*, de Shvets). Resumen de lo que ya está en el código y **hay que respetar**:

| Patrón | Dónde | Regla |
|---|---|---|
| **Strategy + DIP** | Servicio abstracto + `*-http.service` + `*-mock.service`, elegidos con `useClass` en `app.config.ts` | Todo dominio nuevo sigue el trío. Los componentes inyectan el abstracto. |
| **Adapter** | `RespuestaLogin` → `Sesion`; tipos `*Api` → modelos; `error-api.ts` | Los tipos crudos de la API no salen de `*-http.service.ts`. |
| **Facade** | Servicios de `core/` | Ningún componente inyecta `HttpClient`. |
| **Chain of Responsibility** | Interceptores `token → sesion → carga`; `authGuard` y `roleGuard` | Lo transversal va como interceptor; el orden se documenta. |
| **Mediator** | Contenedor/presentacional (`partes/`) | Solo el contenedor inyecta servicios; los hijos usan `input()` y `output()`. |
| **Observer** | `signal`, `computed`, `toSignal` | Estado en signals; sin suscripciones vivas. |
| **Singleton** | Servicios de `core/` (DI) | Sin estado mutable a nivel de módulo. |
| **Tabla por clave** | `APARIENCIA_POR_ESTADO`, `enlacesPorSesion`, `destinoSegunRoles` | Lo que varía por estado o rol, en una tabla con caso por defecto; sin `if` repetidos. |
| **Composite** | `estructura-panel` + `shared/ui/` | Componer, no heredar: sin `extends` entre componentes. |
| **Builder** | `FormBuilder` tipado | Formularios reactivos tipados. |
| **Fábricas / funciones puras** | `contarPorEstado`, `novedadesDelLegajo`, `validarArchivoPdf`… | La lógica de negocio del front, en funciones puras en `core/` con spec. |

Principios: encapsular lo que varía, programar contra interfaces, composición sobre herencia y SOLID. Un patrón se aplica porque resuelve un problema, no por moda. Si agregás o cambiás uno, actualizá `docs/patrones-frontend.md`.

---

## Git y commits

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Un commit por cambio lógico. Si el cambio afecta una regla de negocio, mencionalo en el commit o en el PR.
- Los merges a `main` los aprueba otra persona. En GitLab: Merge Requests desde `feature/...` hacia `develop` y `main`.

## Testing

- Front: Vitest (`npm test`). Cubrir guards, servicios HTTP, validación de PDF, progreso y estados.
- Back: mockear `IEmailService` y el sistema de archivos.
- Una historia no está terminada sin la validación de QA. Los casos CP01 a CP36 de la documentación v0.5 son los criterios de aceptación.

## Qué SÍ hacer
- Verificar contra el código antes de usar un endpoint, un rol o un campo.
- Preguntar por la historia o el sprint (Jira `SCRUM-*`) si no está claro antes de un feature grande.
- Reusar `insignia-estado`, los guards y los servicios existentes.
- Aplicar y respetar los patrones de diseño del front (ver la sección de patrones).
- Actualizar esta documentación cuando el código cambie lo que dice.

## Qué NO hacer
- No crear un rol `Preceptor`.
- No permitir formatos distintos de PDF, ni "para probar".
- No escribir URLs de la API fuera de `api.ts` ni IDs de rol fuera de `rol.ts`.
- No inventar contratos de API: si el endpoint no existe, se maqueta deshabilitado y se acuerda con backend.
- No omitir el mail ni el motivo al implementar un rechazo.

---

## Roadmap

| Sprint | Fechas | Foco |
|---|---|---|
| 1 | 01/08 – 02/09/2026 (extendido) | Login, carga de documentación, justificativos, programa de materia, autogestión estudiantil |
| 2 | 01/09 – 30/09/2026 | Certificado de alumno regular, gestión de usuarios y roles, notificaciones, revisión de legajos, reconocimiento de saberes |
| 3 | 01/10 – 31/10/2026 (**en curso**) | Calendario de exámenes, SIAADE, listados de Director y Secretario, cambio de contraseña |

Integración del 01 al 07/11, correcciones hasta el 10/11 y despliegue del 11 al 20/11/2026.
