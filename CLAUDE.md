# CLAUDE.md

Este archivo le da contexto a Claude Code (u otro agente de IA) para trabajar sobre el repositorio **ISCGB — Sistema de Gestión Documental y Autogestión Académica**. Léelo antes de generar o modificar código.

Para el contexto funcional completo (alcance, roles, sprints, arquitectura) ver **`ISCGB-PROJECT.md`** en la raíz del repo. Este documento se enfoca en **convenciones y reglas de trabajo** para que el código generado sea consistente entre todo el equipo.

---

## Resumen del proyecto

Sistema ERP web para digitalizar la gestión de legajos y documentación académica del Instituto Superior Cura Gabriel Brochero. Reemplaza planillas, papel y seguimiento por correo con una plataforma centralizada, con roles (Director, Secretario, Docente, Alumno), carga de PDFs, revisión/aprobación y notificaciones automáticas.

**Stack:** .NET 10 (ASP.NET Core Web API, Clean Architecture) · Angular 20+ (standalone, zoneless) · SQL Server · EF Core · JWT + RBAC · FluentValidation · Serilog.

> **Importante:** el backend se desarrolla sobre .NET 10. No generes código ni instrucciones de setup para versiones anteriores del SDK.

---

## Convenciones de nombres (obligatorias)

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Clases y entidades (C#) | `PascalCase` | `UsuarioService`, `LegajoAlumno`, `JustificativoInasistencia` |
| Interfaces (C#) | `I` + `PascalCase` | `IDocumentService`, `IEmailService` |
| Métodos (C#) | `PascalCase` | `AprobarDocumento()`, `RechazarLegajo()` |
| Propiedades (C#) | `PascalCase` | `FechaVencimiento`, `EstadoActual` |
| Variables locales / parámetros (C#) | `camelCase` | `documentoActual`, `usuarioId` |
| Métodos y variables (TypeScript) | `camelCase` | `obtenerLegajo()`, `fechaVencimiento` |
| Clases/Interfaces (TypeScript) | `PascalCase` | `AuthService`, `LegajoModel` |
| Archivos Angular | `kebab-case` | `dashboard-alumno.component.ts`, `role.guard.ts` |
| Enums (C#) | `PascalCase`, singular | `EstadoDocumento`, `RolUsuario`, `TipoDocumento` |
| Rutas Angular / features | `kebab-case` | `dashboard-docente`, `dashboard-secretario` |

No mezcles convenciones dentro de un mismo archivo. Si un archivo existente usa una convención distinta a la de esta tabla, seguí la convención del archivo existente y avisá al usuario en vez de reescribir todo el archivo sin que te lo pidan.

---

## Reglas de negocio que el código SIEMPRE debe respetar

Estas reglas vienen del documento de MVP y son **no negociables**: cualquier feature que las viole está mal, aunque el pedido puntual no las mencione explícitamente.

1. **Formato único de subida:** solo se aceptan archivos **`.PDF`**.
   - Validar en frontend (UX) **y** en backend (seguridad real — nunca confiar solo en el input del cliente).
   - Rechazar por contenido (magic bytes / content-type real), no solo por extensión del nombre de archivo.

2. **Renombrado automático de archivos:** todo documento subido debe renombrarse en el backend con el formato exacto:
   ```
   ISCGB_NombreyApellido_NombreDocumento
   ```
   - Esta lógica vive en la capa de **Infraestructura** (servicio de archivos), nunca en el Controller ni en el Frontend.
   - El nombre original del archivo del usuario no debe usarse para persistir en disco.

3. **Estados de documento y trazabilidad visual:** todo documento tiene exactamente tres estados posibles, sin excepciones ni estados intermedios:
   - 🟢 **Verde** = Aprobado
   - 🟡 **Amarillo** = Pendiente
   - 🔴 **Rojo** = Rechazado
   - En el frontend, usar **siempre** el componente compartido de badge de estado (`shared/components`). No reimplementar el badge dentro de cada feature.

4. **Notificación automática ante rechazo:** cuando un documento pasa a estado **Rechazado**, el sistema debe disparar automáticamente un email al usuario correspondiente vía `IEmailService`. Si agregás un flujo nuevo que cambia el estado de un documento a Rechazado, tenés que enganchar esta notificación — no es opcional.

5. **Roles y permisos (RBAC):** los cuatro roles son `Director`, `Secretario`, `Docente`, `Alumno`.
   - El rol **Preceptor** no existe como entidad independiente en el MVP: sus funciones están unificadas dentro de **Secretario**. No crear un rol `Preceptor` separado.
   - Todo endpoint privado debe estar protegido por rol en el backend (`[Authorize(Roles = "...")]`) **y** la ruta correspondiente debe estar protegida por `RoleGuard` en el frontend. Un guard del lado del cliente nunca reemplaza la autorización del backend.

---

## Arquitectura — qué va en cada capa (backend)

Clean Architecture. Las dependencias apuntan siempre **hacia adentro**.

| Capa | Contiene | No debe contener |
|------|----------|-------------------|
| **Presentación** (`Controllers`) | Endpoints REST, mapeo de DTOs, `[Authorize]` | Lógica de negocio, queries EF Core directas |
| **Aplicación** | Servicios, casos de uso, interfaces (`IDocumentService`, `IEmailService`), `FluentValidation` | Referencias a EF Core, SMTP, o filesystem directamente |
| **Dominio** | Entidades (`Usuario`, `Alumno`, `Docente`, `Legajo`, `Justificativo`, `Examen`, `Documento`), Enums | Cualquier dependencia externa (ni siquiera EF Core) |
| **Infraestructura** | Implementación de EF Core, `DbContext`, migraciones, escritura/renombrado de archivos, `EmailService`, `Serilog` | Lógica de negocio (eso es de Aplicación) |

Si estás por escribir una regla de negocio (por ejemplo, "cuándo se considera completo un legajo"), va en un **Servicio de Aplicación**, no en un Controller ni en un componente Angular.

## Arquitectura — qué va en cada carpeta (frontend)

```
core/       → singletons: guards, interceptors, servicios base (auth)
shared/     → componentes reutilizables entre roles (badges, tablas, file-upload)
features/   → un folder por dashboard de rol, lazy-loaded vía loadComponent
```

- Componentes **standalone** siempre; no usar `NgModule`.
- El proyecto es **zoneless** (`provideZonelessChangeDetection()`) — no asumas detección de cambios automática vía Zone.js al escribir código async.
- Un componente de un `feature` (p. ej. `dashboard-docente`) no debe ser importado desde otro `feature` (p. ej. `dashboard-secretario`). Si dos features necesitan lo mismo, ese algo va a `shared`.

---

## Git y commits

- **Conventional Commits obligatorio:** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
  - Ejemplos: `feat: agregar carga de justificativos para docentes`, `fix: corregir validación de formato PDF en upload`.
- Un commit por cambio lógico — evitar mezclar refactors grandes con features nuevas en el mismo commit.
- Si el cambio afecta una regla de negocio de las listadas arriba, mencionarlo explícitamente en el mensaje de commit o en la descripción del PR.

---

## Testing

- Antes de dar una historia por terminada, tiene que poder validarse contra el rol de **QA** del equipo (Tester dedicado) — no autodeclarar "hecho" sin pruebas funcionales mínimas.
- Al testear servicios que dependan de `IEmailService` o del sistema de archivos, **mockearlos** — no depender de SMTP real ni de escritura en disco real en los tests.
- Cubrir con tests especialmente: la validación de formato `.PDF`, el renombrado de archivos, la transición de estados de documento (y el disparo de email en rechazo), y los guards de rol (`auth.guard`, `role.guard`).

---

## Qué SÍ hacer

- Preguntar por el sprint/historia de usuario asociada si no está clara antes de implementar un feature grande (ver `ISCGB-PROJECT.md` → Cronograma de Sprints).
- Reusar el componente de badge de estado y los guards existentes en vez de reimplementarlos.
- Mantener la validación de PDF y el renombrado de archivos en la capa de Infraestructura.
- Usar .NET 10 en cualquier instrucción de setup, `csproj`, Dockerfile o CI/CD que generes.

## Qué NO hacer

- No generar código para .NET 8/9, ni referencias a esas versiones del SDK.
- No crear un rol `Preceptor` separado de `Secretario`.
- No permitir subir formatos distintos a `.PDF`, ni siquiera "temporalmente" o "para probar".
- No poner lógica de negocio en Controllers ni en componentes Angular.
- No omitir la notificación por email al implementar un flujo que rechaza documentos.
- No mezclar `camelCase` y `PascalCase` dentro del mismo lenguaje/capa.

---

## Roadmap de referencia (para priorizar features)

| Sprint | Fechas | Foco |
|--------|--------|------|
| Sprint 1 | 01/08/2026 – 31/08/2026 | Login, carga de documentación docente, justificativos, autogestión estudiantil |
| Sprint 2 | 01/09/2026 – 30/09/2026 | Certificado de alumno regular, gestión de usuarios/roles, notificaciones, reconocimiento de saberes |
| Sprint 3 | 01/10/2026 – 31/10/2026 | Calendario de exámenes, mejoras de enlace SIAADE, visualizaciones de Director/Secretario, cambio de contraseña |

Fecha estimada de lanzamiento del MVP: **noviembre 2026**.
