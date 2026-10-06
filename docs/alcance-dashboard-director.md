# Alcance del panel del Director

Fecha de análisis: **26/08/2026** · Sprint 1
Actualizado: **27/08/2026** — ver "Actualización: el backend ya tiene endpoints reales" al final.

Este documento aplica el mismo triage de `docs/alcance-login.md` al panel
del Director: qué se construyó, con qué datos, y qué queda pendiente.

## El triage de 3 preguntas (recordatorio)

1. ¿Está en algún sprint del roadmap? → `docs/ISCGB-PROJECT.md`
2. ¿Existe el endpoint? → colección de Postman del QA
3. ¿Existe la tabla o el campo en la base? → script SQL

| Resultado | Qué se hace |
|---|---|
| Las tres en ✅ | **Construir** |
| Está en sprint pero falta backend | **Maquetar con datos falsos** |
| No está en ningún sprint | **Archivar** en Figma, no construir |

## Resultado aplicado al panel del Director (26/08/2026)

| Elemento | Sprint | API | Base | Decisión |
|---|:---:|:---:|:---:|---|
| Estructura de panel (barra lateral + encabezado) | ✅ | — | — | **Construido** — es solo frontend |
| Listado de usuarios con rol y estado de legajo | Sprint 2/3¹ | ❌ | ⚠️² | **Maquetado con datos falsos** |
| Tarjetas de resumen (totales por estado) | Sprint 2/3¹ | ❌ | ⚠️² | **Maquetado con datos falsos** (se calculan del listado falso) |
| Acceso a "Entregar programa" si la sesión también es Docente | ✅ | ✅ | ✅ | **Construido** — reusa lo que ya existía para `Inicio` |
| ¿Olvidaste tu contraseña? → pantalla de recuperación | Sprint 3 | ❌ | ✅ | **Construido con datos falsos** — antes estaba deshabilitado |

¹ `ISCGB-PROJECT.md` ubica "Gestión de usuarios y roles" en Sprint 2 y
"Visualización de docentes, alumnos y secretarios (Director)" en Sprint 3.
Sprint 1 (01/08–31/08/2026) está en curso al escribir esto.

² La base no tiene una entidad `Documento`: cada fila de `legajo` es un
documento, y no hay un endpoint que liste usuarios con su legajo asociado
(ver `docs/contrato-api.md`). **Esto cambió el 27/08 — ver la actualización
al final.**

## Por qué se construyó igual, con datos falsos

A diferencia de "Solicitar acceso" en el login (que se archivó porque no
está en ningún sprint), el panel del Director **sí** está en el roadmap:
solo que un poco más adelante y sin backend todavía. El mismo criterio que
ya usa `AuthMockService` — avanzar con el frontend sin bloquearse por un
backend en construcción, y poder decir con certeza "si falla con datos
falsos, el problema es nuestro" — aplica acá.

## Multi-rol: cómo se resolvió

`login.ts` manda a cualquier sesión con el rol Director a `/director/panel`,
sea cual sea el resto de sus roles. Si esa sesión tiene además el rol
Docente, `PanelDirector` agrega "Entregar programa de materia" a su propio
menú (ver el componente, sección `enlaces`) reusando la ruta
`docente/entrega-programa` que ya existía.

**No se construyeron dos paneles ni una fusión de dashboards.** Se eligió
el rol de mayor alcance (Director) como pantalla base, y se le suman los
accesos puntuales que los otros roles de la sesión habilitan — el mismo
patrón que ya usaba `Inicio` con `puedeEntregarPrograma`. Si en el futuro
aparece un caso de dos roles sin relación de jerarquía clara (por ejemplo
Secretario y Alumno), esta decisión hay que revisarla explícitamente, no
asumir que el mismo criterio alcanza.

Hay un usuario de prueba armado para este caso: DNI `55555555`, "Dora
Directora y Docente" (`usuarios-de-prueba.ts`).

## Recuperar contraseña

`docs/alcance-login.md` había dejado el enlace "¿Olvidaste tu contraseña?"
visible pero deshabilitado, a la espera del endpoint de Sprint 3. Ahora
existe `features/recuperar-contrasena/`, una pantalla pública (sin
`authGuard`) que simula el envío con un `setTimeout` y no manda ningún
correo real — se lo dice explícitamente a quien la usa.

`formulario-login.html` y `formulario-login.ts` ya se actualizaron: el
control pasó de `<button disabled>` a `<a routerLink="/recuperar-contrasena">`
(navega a otro lado, así que es enlace y no botón — misma distinción que
usa `design-system.md` para `<app-boton>`).

## Actualización 27/08/2026: el backend ya tiene endpoints reales

Al conectar la carpeta `ISCGB_Backend` se pudo leer el código fuente real
del backend (antes solo se conocía por `docs/contrato-api.md`, que había
quedado desactualizado). Aparecieron dos controladores que no existían
cuando se escribió este documento:

- **`UsuariosController`** (`GET /api/Usuarios`) — listado paginado de
  personas con su DNI, nombre completo y roles.
- **`LegajosController`** (`GET /api/Legajos/usuario/{id}`, entre otros) —
  documentos de un usuario puntual.

Esto cambia la fila 2 de la tabla de arriba: **el listado de usuarios ya no
es 100% inventado.** `UsuariosHttpService` (`core/usuarios/`) reemplazó a
`UsuariosMockService` en `app.config.ts` y pega contra `GET /api/Usuarios`
de verdad.

**Pero con un límite importante, a propósito no oculto:** `GET /api/Usuarios`
NO devuelve el estado del legajo de cada persona — ese cruce
(Usuario × su Legajo) no existe todavía del lado del backend, porque
`LegajosController` solo puede traer los documentos de UN usuario por vez,
no de todo el instituto junto. Por eso `estadoLegajo` queda `null` para
todas las filas del panel; `app-insignia-estado` ya muestra `null` como
"sin datos" en vez de inventar un color.

Antes (con `UsuariosMockService`) cada fila mostraba un estado de legajo
inventado — se veía "más completo" para hacer una demo, pero no
correspondía a ningún dato real. Se prefirió el listado real con el hueco
visible antes que seguir mostrando datos de mentira sin decirlo. Si para
una demo puntual conviene volver a ver los tres estados llenos, alcanza con
cambiar una línea en `app.config.ts` (`UsuariosService` → de nuevo
`UsuariosMockService`).

**Pendiente real ahora:** que el backend agregue, al `GET /api/Usuarios` (o
a un endpoint nuevo), el estado de legajo agregado por persona. Recién ahí
tiene sentido escribir la versión definitiva de `estadoLegajo`.

**Paginación:** `GET /api/Usuarios` pagina de a 10 registros por default.
`UsuariosHttpService` pide `registrosPorPagina=500` para traer "todo" el
instituto de una vez, como pide la "visualización global" de
`ISCGB-PROJECT.md`. Si el instituto real supera los 500 usuarios, el
listado queda incompleto en silencio — está comentado en el código
(`usuarios-http.service.ts`) para que se note cuando haga falta paginación
de verdad en el panel.

## Pendientes con el equipo de backend

1. ~~Endpoint para listar usuarios del instituto con rol y estado de
   legajo.~~ El listado de usuarios ya existe (`GET /api/Usuarios`); falta
   que incluya el estado de legajo por persona.
2. Endpoint de recuperación de contraseña (Sprint 3) —
   `Usuarios.token_recuperacion` y `expiracion_token` ya existen en la base.
