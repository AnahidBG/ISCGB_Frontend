# Alcance de los paneles de Secretario, Docente y Alumno

Fecha de análisis: **26/08/2026** · Sprint 1
Actualizado: **27/08/2026** — ver "Actualización: el backend ya tiene endpoints reales" al final.

Continúa `docs/alcance-dashboard-director.md` con el mismo triage de 3
preguntas, aplicado a los tres roles que faltaban.

## Resultado del triage (26/08/2026)

| Elemento | Sprint | API | Base | Decisión |
|---|:---:|:---:|:---:|---|
| Panel del Secretario: tarjetas + actividad reciente + próximos pasos | ✅¹ | ❌ | ⚠️² | **Maquetado con datos falsos** |
| Panel del Docente: legajo propio + progreso | ✅¹ | ❌ | ⚠️² | **Maquetado con datos falsos** |
| Panel del Alumno: legajo propio + progreso | ✅¹ | ❌ | ⚠️² | **Maquetado con datos falsos** |
| Botones de aprobar/rechazar en el panel del Secretario | ✅¹ | ❌ | ❌ | **Archivado por ahora** — ver más abajo |
| Justificativos de inasistencia, reconocimiento de saberes, enlace a SIAADE (Alumno) | Parcial³ | ❌ | ❌ | **Archivado** — sin pantalla propia todavía |

¹ Sprint 1 incluye explícitamente "Recepción y validación de justificación
(Secretario)" y "Revisión de documentación entregada (Docente)"
(`ISCGB-PROJECT.md` → Cronograma de Sprints).

² Igual que con el Director: no hay entidad `Documento` en la base, cada
fila de `legajo` es un documento, y no hay endpoint que la exponga
(`docs/contrato-api.md`). **Parcialmente resuelto el 27/08 — ver la
actualización al final.**

³ Justificativos está en Sprint 1; reconocimiento de saberes en Sprint 2. El
enlace a SIAADE no tiene URL definida con el instituto todavía.

## Por qué no hay botones de aprobar/rechazar

Se pensó agregarlos al panel del Secretario, pero cambiar el estado de un
documento de mentira a "Aprobado" con un click no prueba nada real, y puede
dar la sensación de que el flujo ya funciona cuando en realidad falta lo
más delicado: la regla de negocio #4 (`CLAUDE.md`) obliga a que rechazar un
documento dispare un email automático vía `IEmailService`, y eso vive en el
backend. Un botón que solo cambia una variable en memoria del navegador
sería peor que no tenerlo — el mismo argumento que ya usó
`docs/alcance-login.md` para sacar "Solicitar acceso" del v1. Se deja
para cuando exista el endpoint de cambio de estado.

**27/08:** ese endpoint ya existe del lado del backend
(`PUT /api/Legajos/auditar/{idLegajo}`), pero tampoco dispara el email
automático de la regla #4 — se leyó el código del controlador y `Auditar
Legajo` solo actualiza `Estado`, `Comentario` e `IdUsuarioAuditor`, sin
ningún `IEmailService` de por medio. El argumento de arriba sigue siendo
válido: agregar el botón ahora daría la falsa sensación de que rechazar
notifica a la persona, cuando todavía no lo hace. Queda pendiente de
backend antes de construir el botón.

## `LegajoService`: una fuente para dos preguntas

`core/legajos/` tiene dos métodos en el mismo contrato:

- `obtenerLegajoPropio()` — el legajo de quien tiene la sesión abierta.
  Lo usan `PanelDocente` y `PanelAlumno`.
- `listarParaRevision()` — documentos de todo el instituto con su dueño.
  Lo usa `PanelSecretario`.

Quedó separado de `UsuariosService` (el que usa el Director) porque
responden preguntas distintas: uno lista PERSONAS, el otro lista
DOCUMENTOS.

## Progreso del legajo — simplificado a propósito

`docs/contrato-api.md` ya documentó la fórmula real:

```
progreso = documentos aprobados del usuario / documentos obligatorios de su rol
```

usando la tabla `roles_tipos_documentos` (qué tipos de documento son
obligatorios para cada rol). Hoy el frontend no consume esa tabla todavía,
así que `PanelDocente` y `PanelAlumno` calculan el progreso como
`aprobados / cargados` — un número optimista, porque no cuenta lo que
todavía falta subir. Queda comentado en el código (`panel-docente.ts`,
`panel-alumno.ts`) para que quien lo retome sepa exactamente qué cambiar.

**27/08:** el endpoint para leer esa tabla ya existe
(`GET /api/Legajos/requeridos-por-rol/{idRol}`, confirmado leyendo
`LegajoController.cs`), así que la fórmula real ya se puede construir. No
se conectó todavía en esta pasada — quedó afuera para no mezclar el
alcance de "consumir Legajos y Usuarios" con "arreglar el cálculo de
progreso", pero es la próxima pieza obvia.

## Ruteo por rol — orden de prioridad

`Login.destinoSegunRoles` ahora manda a cada sesión a su panel:
Director → `/director/panel`, Secretario → `/secretario/panel`, Docente →
`/docente/panel`, Alumno → `/alumno/panel`, y sin ningún rol → `/inicio`
(que sigue existiendo para ese caso y para cuando `roleGuard` rebota a
alguien de una pantalla que no es suya).

Para alguien con más de un rol se eligió un orden de mayor a menor alcance
(Director > Secretario > Docente > Alumno), documentado ya en
`docs/alcance-dashboard-director.md` para el caso Director + Docente.

## Actualización 27/08/2026: el backend ya tiene endpoints reales

Al conectar `ISCGB_Backend` apareció `LegajosController`, con estos
endpoints reales (confirmados leyendo el código fuente, no solo la
documentación):

| Endpoint | Qué hace | ¿Se conectó? |
|---|---|---|
| `GET /api/Legajos/usuario/{id}` | Documentos de UN usuario | ✅ Sí — `LegajoHttpService.obtenerLegajoPropio()` |
| `POST /api/Legajos` | Subir un documento (multipart) | ❌ No — no hay pantalla de "Subir documento" todavía |
| `PUT /api/Legajos/auditar/{id}` | Aprobar/rechazar | ❌ No — sin email automático de la regla #4, ver arriba |
| `GET /api/Legajos/requeridos-por-rol/{idRol}` | Documentos obligatorios de un rol | ❌ No — próxima pieza para el cálculo de progreso real |

**`LegajoService` (`app.config.ts`) ahora es `LegajoHttpService`, mitad real
mitad simulada:**

- `obtenerLegajoPropio()` (usado por `PanelDocente` y `PanelAlumno`) es
  **real**. Maneja el 404 del backend ("no se encontraron documentos para
  este usuario") como legajo vacío, no como error.
- `listarParaRevision()` (usado por `PanelSecretario`) **sigue simulado**,
  con la misma data inventada de siempre: el backend no tiene un endpoint
  que junte documentos de todo el instituto, solo por usuario. Está
  documentado en el código de `legajo-http.service.ts`, no escondido.

**Riesgo conocido de `tipoDocumento`:** el backend devuelve el NOMBRE del
tipo de documento (`"DNI"`, `"Título de Grado"`, etc.), no un ID — así que
si dos instalaciones del backend nombran los tipos distinto, el frontend no
se entera. No es un problema hoy, pero vale tenerlo presente si en algún
momento se filtra o agrupa por tipo de documento.

## Pendientes con el equipo de backend

1. ~~Endpoint de documentos por usuario (legajo propio)~~ — ya existe y está
   conectado. Sigue faltando un endpoint de documentos pendientes de
   revisión para TODO el instituto (o un filtro sobre el existente).
2. Que `PUT /api/Legajos/auditar/{id}` dispare el email automático de la
   regla de negocio #4 antes de construir los botones de aprobar/rechazar.
3. Conectar `GET /api/Legajos/requeridos-por-rol/{idRol}` para calcular el
   progreso real (ya no es un bloqueo de backend, es trabajo de frontend
   pendiente).
