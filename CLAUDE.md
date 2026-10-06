# CLAUDE.md

Contexto para Claude Code, o cualquier otro agente de IA, que trabaje sobre ISCGB, el sistema de gestión documental y autogestión académica del instituto. Leelo antes de generar o modificar código.

El proyecto está en desarrollo y cambia todas las semanas. Este archivo se verificó contra el código el **03/10/2026**: si algo de acá contradice al código o al script de la base, manda el código. Avisá la diferencia y actualizá este archivo en el mismo cambio.

Dónde está el resto:

- Alcance, roles, sprints, stack y seguridad: `docs/ISCGB-PROJECT.md`.
- Patrones de diseño del front, que son obligatorios: `docs/patrones-frontend.md`.
- Contrato de la API y verificaciones: `docs/contrato-api.md`, `docs/verificacion-backend.md` y la fuente de verdad, `src/app/core/configuracion/api.ts`.
- Guía técnica completa y referencia de los documentos de Drive: `CLAUDE_GUIDE_ISCGB-v2.md` y `referencia-documentacion-drive.md`, en la carpeta `Claude/` del proyecto (fuera de este repo) y en el Project de claude.ai.

## Resumen

ERP web que digitaliza los legajos y la documentación del Instituto Superior Cura Gabriel Brochero. Tiene cuatro roles (Director, Secretario, Docente y Alumno), carga de PDF, revisión y aprobación, y notificaciones.

El stack real:

- Frontend: Angular 21 (standalone, zoneless por defecto), Tailwind v4 y Vitest.
- Backend: .NET 10 Web API (`AutoGestionAPI`, un solo proyecto), EF Core sobre SQL Server (`Autogestion_Docente`), JWT, BCrypt, QuestPDF y Swagger.
- Infraestructura: Docker. Los repos están en GitHub (`AnahidBG/*`) y se están migrando a GitLab (`git.icgb.com.ar`).

No generes código ni configuración para .NET 8 o 9, ni para Angular anterior a 21. No agregues FluentValidation, Serilog, jsPDF ni Angular Material sin acordarlo con el equipo: hoy no están.

## Datos que más se confunden

- IDs de rol: **1 Director, 2 Secretario, 3 Docente, 4 Alumno**. Están en `core/auth/modelos/rol.ts` (`ID_ROL`) y en la tabla `Roles`.
- Rol en el JWT: un claim `role` por rol, con el nombre ("Docente") y no el número. Lo arma `AuthController.GenerarJwtToken`.
- Roles en el login: vienen en el body, `roles: [{ idRol, nombreRol }]`, y el front los toma de ahí (`core/auth/auth-http.service.ts`).
- Badge de estado: es `insignia-estado`, en `shared/ui/insignia-estado/`.
- Sesión: en `sessionStorage`, con la clave `iscgb.sesion` (`auth-http.service.ts`).
- URLs de la API: solo en `core/configuracion/api.ts`.

## Convenciones de nombres

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Clases y entidades (C#) | `PascalCase` | `UsuarioService`, `JustificativoInasistencia` |
| Interfaces (C#) | `I` + `PascalCase` | `IDocumentacionService`, `IEmailService` |
| Métodos y propiedades (C#) | `PascalCase` | `AprobarDocumento()`, `FechaVencimiento` |
| Variables y parámetros (C#) | `camelCase` | `documentoActual` |
| Métodos y variables (TS) | `camelCase` | `obtenerLegajo()` |
| Clases e interfaces (TS) | `PascalCase` | `AuthService`, `Sesion` |
| Archivos Angular | `kebab-case`, sin sufijo `.component` | `panel-alumno.ts` + `panel-alumno.html`, `role.guard.ts` |
| Rutas | `kebab-case`, agrupadas por rol | `/director/panel`, `/legajo/mis-documentos` |

El código, los nombres y los comentarios van en español.

No mezcles convenciones dentro de un archivo. Si uno existente usa otra, seguí la suya y avisá, en vez de reescribirlo.

## Reglas de negocio

No son negociables, pero varias todavía no están implementadas en el backend. Que una regla figure acá no significa que ya funcione; el estado detallado está en `CLAUDE_GUIDE_ISCGB-v2.md` §2.

1. **Solo PDF.** El front valida el MIME y el back tiene que validar por magic bytes. Hoy el back no lo hace en legajos, y en justificativos solo mira el `ContentType`.
2. **Renombrado.** El backend guarda cada archivo como `ISCGB_NombreyApellido_NombreDocumento.pdf` y nunca persiste el nombre original. Hoy se hace en los controllers y le agrega un timestamp.
3. **Tres estados:** Aprobado (verde), Pendiente (amarillo) y Rechazado (rojo), siempre con el componente `insignia-estado`. En la base `estado` es `varchar NULL`, así que un valor nulo o desconocido se muestra con un estado por defecto.
4. **Rechazo.** El motivo es obligatorio, con las opciones estándar de la institución, y se envía un mail automático por `IEmailService`. En legajos el front ya usa los 7 motivos (`core/legajos/motivos-rechazo.ts`, desde el 05/10/2026). En justificativos no hay dónde mandarlo, porque el PUT de auditoría no recibe comentario. El mail de rechazo todavía no existe en el back. Detalle en `docs/contrato-api.md`.
5. **RBAC.** Son cuatro roles; Preceptor está dentro de Secretario y no se crea como rol aparte. Hace falta `[Authorize(Roles=...)]` en el back y `roleGuard` en el front. Al 06/10/2026 el back lo exige en `UsuariosAdmin`, `Certificados`, `ReconocimientoSaberes` y en `mis-materias` de `Materias`; `Legajos`, `Justificativos`, `Usuarios`, `ProgramasMateria` y `Configuracion` siguen sin protección. Nadie aprueba sus propios documentos.

Si tu cambio toca un flujo afectado por una regla pendiente, implementala o dejalo explícito en el PR. No la des por cubierta.

## Arquitectura: dónde va cada cosa

### Frontend

```text
core/       servicios por dominio (abstracto + *-http.service.ts + *-mock.service.ts), guards,
            interceptors, configuracion/api.ts
shared/ui/  componentes reutilizables entre roles (insignia-estado, zona-archivo, estructura-panel…)
features/   pantallas por rol y por trámite, lazy-loaded con loadComponent
```

- Siempre standalone, sin `NgModule`, con signals y `OnPush`. Angular 21 es zoneless por defecto: no asumas Zone.js.
- Contenedor y presentacional: solo el contenedor inyecta servicios. Los presentacionales van en `partes/`.
- Una feature no importa componentes de otra feature. Lo compartido va a `shared/`.
- La respuesta cruda de la API se traduce una sola vez a un modelo limpio en `core/`. Por ejemplo, `RespuestaLogin` pasa a `Sesion`.

### Backend

Hoy es un proyecto único: `Controllers/`, `DTOs/`, `Models/`, `Services/`, `Data/` y `Migrations/`.

El objetivo documentado es Clean Architecture. Las reglas de negocio nuevas conviene ponerlas en `Services/` y no sumar más lógica a los controllers. Un refactor de capas se coordina con backend; no se hace de paso.

## Patrones de diseño del frontend

Son obligatorios. El detalle, con ejemplos del código, está en `docs/patrones-frontend.md`, que toma como base *Sumérgete en los Patrones de Diseño*, de Shvets. Esto es lo que ya está en el código y hay que respetar:

- **Strategy + DIP.** Cada dominio tiene un servicio abstracto, un `*-http.service` y un `*-mock.service`, elegidos con `useClass` en `app.config.ts`. Todo dominio nuevo sigue el trío y los componentes inyectan el abstracto.
- **Adapter.** `RespuestaLogin` pasa a `Sesion`, los tipos `*Api` pasan a modelos y los errores pasan por `error-api.ts`. Los tipos crudos de la API no salen de `*-http.service.ts`.
- **Facade.** Los servicios de `core/` esconden HTTP: ningún componente inyecta `HttpClient`.
- **Chain of Responsibility.** Los interceptores van en el orden `token → sesion → carga`, y en las rutas, `authGuard` y `roleGuard`. Lo transversal va como interceptor y el orden se documenta.
- **Mediator.** Es el contenedor y sus presentacionales en `partes/`: solo el contenedor inyecta servicios y los hijos usan `input()` y `output()`.
- **Observer.** El estado va en `signal`, `computed` y `toSignal`, sin suscripciones vivas.
- **Singleton.** Los servicios de `core/` son una instancia por app. Sin estado mutable a nivel de módulo.
- **Tabla por clave.** Lo que varía por estado o por rol va en una tabla con caso por defecto, sin `if` repetidos: `APARIENCIA_POR_ESTADO`, `enlacesPorSesion`, `destinoSegunRoles`.
- **Composite.** Las pantallas se componen con `estructura-panel` y `shared/ui/`. Sin `extends` entre componentes.
- **Builder.** Formularios reactivos tipados con `FormBuilder`.
- **Funciones puras.** La lógica de negocio del front va en funciones puras en `core/`, con su spec: `contarPorEstado`, `novedadesDelLegajo`, `validarArchivoPdf`.

Los principios detrás: encapsular lo que varía, programar contra interfaces, composición sobre herencia y SOLID. Un patrón se aplica porque resuelve un problema, no por moda. Si agregás o cambiás uno, actualizá `docs/patrones-frontend.md`.

## Git y commits

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Un commit por cambio lógico. Si el cambio afecta una regla de negocio, mencionalo en el commit o en el PR.
- Los merges a `main` los aprueba otra persona. En GitLab se trabaja con Merge Requests desde `feature/...` hacia `develop` y `main`.

## Testing

- Front: Vitest (`npm test`). Hay que cubrir guards, servicios HTTP, validación de PDF, progreso y estados.
- Back: se mockean `IEmailService` y el sistema de archivos.
- Una historia no está terminada sin la validación de QA. Los criterios de aceptación son los casos CP01 a CP36 de la documentación v0.5.

## Qué hacer

- Verificar contra el código antes de usar un endpoint, un rol o un campo.
- Antes de un feature grande, preguntar por la historia o el sprint (Jira `SCRUM-*`) si no está claro.
- Reusar `insignia-estado`, los guards y los servicios que ya existen.
- Respetar los patrones de diseño del front.
- Actualizar esta documentación cuando el código cambie lo que dice.

## Qué no hacer

- No crear un rol `Preceptor`.
- No permitir formatos distintos de PDF, ni siquiera "para probar".
- No escribir URLs de la API fuera de `api.ts` ni IDs de rol fuera de `rol.ts`.
- No inventar contratos de API. Si el endpoint no existe, se maqueta deshabilitado y se acuerda con backend.
- No omitir el mail ni el motivo al implementar un rechazo.

## Roadmap

- Sprint 1, del 01/08 al 02/09/2026 (extendido): login, carga de documentación, justificativos, programa de materia y autogestión estudiantil.
- Sprint 2, del 01/09 al 30/09/2026: certificado de alumno regular, gestión de usuarios y roles, notificaciones, revisión de legajos y reconocimiento de saberes.
- Sprint 3, del 01/10 al 31/10/2026, **en curso**: calendario de exámenes, SIAADE, listados de Director y Secretario, y cambio de contraseña.

Después viene la integración del 01 al 07/11, las correcciones hasta el 10/11 y el despliegue del 11 al 20/11/2026.
