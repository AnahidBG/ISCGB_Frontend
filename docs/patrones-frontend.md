# Patrones de diseño en el frontend (ISCGB_Frontend)

> **Verificado contra el código el 03/10/2026.** Es un desarrollo en curso: si este documento y el código no coinciden, manda el código. Actualizá este archivo en el mismo cambio que agregue, quite o modifique un patrón.
>
> **Base teórica:** *Sumérgete en los Patrones de Diseño* (Alexander Shvets, Refactoring.Guru), que cubre los 22 patrones clásicos (GoF), los principios de diseño y SOLID. El libro tiene licencia de uso personal, así que **no se sube al repo ni al Project**. Este documento es nuestra propia aplicación de esos conceptos a ISCGB; para la teoría de cada patrón, ver el libro o refactoring.guru.

---

## 0. Cómo usar los patrones acá

- **Un patrón se usa porque resuelve un problema concreto del código, no por usarlo.** Si la solución simple alcanza (una función pura, un `computed`), va la simple.
- **Primero se respeta lo que ya existe.** Los patrones del §2 ya están en el código y son obligatorios: el código nuevo los sigue y no inventa una forma paralela de hacer lo mismo.
- **Se nombra el patrón.** Si aplicás uno, decilo en un comentario corto o en la descripción del PR (por ejemplo "Adapter: traduce `LegajoApi` → `DocumentoLegajo`"). Así el equipo lo reconoce y QA sabe qué mirar.
- **Angular ya implementa varios patrones.** DI, interceptores, guards y signals son patrones; usalos en lugar de reimplementarlos a mano.

---

## 1. Principios de diseño (obligatorios)

| Principio | Qué significa en ISCGB | Regla |
|---|---|---|
| **Encapsular lo que varía** | Lo que cambia seguido (contratos de la API, textos por estado, menús por rol) vive en un solo lugar. | URLs solo en `core/configuracion/api.ts`. IDs de rol solo en `core/auth/modelos/rol.ts`. Apariencia por estado solo en `insignia-estado`. Menús por rol solo en `enlaces-por-rol.ts`. |
| **Programar contra una interfaz** | Los componentes dependen de `AuthService`, `LegajoService`, etc. (clases abstractas), nunca de `*HttpService`. | `inject(LegajoService)`, nunca `inject(LegajoHttpService)` en un componente. |
| **Composición sobre herencia** | Las pantallas se arman combinando componentes de `shared/ui/`. | No usar `extends` entre componentes. Solo los servicios abstractos de `core/` usan herencia. |
| **S — Responsabilidad única** | Un componente dibuja o coordina; un servicio habla con la API; una función pura calcula. | Si un archivo mezcla las tres cosas o pasa las ~300 líneas, partilo. |
| **O — Abierto/cerrado** | Agregar un estado, un rol o un tipo de documento no debería obligar a tocar muchos `if`. | Usar tablas de búsqueda (`Record<...>`) en vez de cadenas de `if`/`switch` repetidas. |
| **L — Sustitución de Liskov** | `AuthMockService` y `AuthHttpService` tienen que ser intercambiables sin que la pantalla lo note. | El mock respeta las mismas firmas, tipos y mensajes de error que la implementación HTTP. |
| **I — Segregación de interfaces** | Los presentacionales reciben solo los `input()` que usan. | No pasar la `Sesion` entera a un componente que solo muestra el nombre. |
| **D — Inversión de dependencias** | `app.config.ts` decide qué implementación usar (`useClass`). | Cambiar mock por real se hace en un solo lugar, sin tocar componentes. |

---

## 2. Patrones que YA están en el código (respetarlos)

### 2.1 Strategy + inversión de dependencias: servicios abstractos con implementación HTTP y mock
- **Dónde:** `core/<dominio>/<dominio>.service.ts` (clase abstracta) + `*-http.service.ts` + `*-mock.service.ts`. Se eligen en `app.config.ts` con `{ provide: AuthService, useClass: AuthHttpService }`. Así están Auth, Legajo, Usuarios, Justificativos, Certificados, ProgramasMateria, ReconocimientoSaberes, Materias y FrecuenciaAvisos (`core/notificaciones/`, SCRUM-151).
- **Regla:** todo dominio nuevo (por ejemplo `core/examenes/` para el calendario) sigue este mismo trío. Si el endpoint todavía no existe, se arranca con el mock.

### 2.2 Adapter: respuesta cruda de la API → modelo limpio
- **Dónde:** `RespuestaLogin` → `Sesion` (`auth-http.service.ts`, método `aSesion`). Los tipos `*Api` de `legajo-http.service.ts` se mapean a los modelos de `core/legajos/modelos/`. Los errores pasan por `core/comun/error-api.ts` (`mensajeDelServidor`, `esEndpointInexistente`).
- **Regla:** los tipos crudos de la API (con sus nombres mezclados, como `estado_usuario` o `lugar_Nacimiento`) **no salen de `*-http.service.ts`**. Un componente nunca ve un `*Api` ni un `HttpErrorResponse`: ve modelos limpios y mensajes en español.

### 2.3 Facade: el servicio de dominio esconde HTTP, mapeo y errores
- **Dónde:** cada `*Service` de `core/` expone operaciones del negocio (`auditar(...)`, `iniciarSesion(...)`) y esconde URLs, multipart y traducción de errores. Lo mismo hace `CargaService` con el loader global.
- **Regla:** **ningún componente de `features/` ni de `shared/` inyecta `HttpClient`** (en los archivos revisados el 03/10 se cumple). Si una pantalla necesita un dato nuevo, se agrega un método al servicio de dominio.

### 2.4 Chain of Responsibility: interceptores y guards
- **Dónde:** `withInterceptors([tokenInterceptor, sesionInterceptor, cargaInterceptor])` en `app.config.ts`. Cada eslabón hace una sola cosa y le pasa la petición al siguiente:
  - `tokenInterceptor` agrega el `Bearer`.
  - `sesionInterceptor` trata el 401 como sesión vencida y el 403 como acceso denegado.
  - `cargaInterceptor` maneja el loader global (se puede apagar con `SIN_CARGA_GLOBAL`).
- En las rutas, `authGuard` y `roleGuard(...roles)` encadenan las validaciones.
- **Regla:** lo transversal a todas las peticiones va como interceptor, no repetido en cada servicio. **El orden importa:** si agregás uno, documentá en `app.config.ts` por qué va en esa posición.

### 2.5 Mediator: contenedor / presentacional
- **Dónde:** `Login` coordina a `FormularioLogin` y `PanelBienvenida`, que no se conocen entre sí. Los hijos van en `partes/`.
- **Regla:** solo el contenedor inyecta servicios. Los presentacionales se comunican únicamente por `input()` y `output()` (API moderna de Angular; no usar `@Input`/`@Output`).

### 2.6 Observer: signals y RxJS
- **Dónde:** `signal`, `computed` y `toSignal` en todo el front (por ejemplo `mis-documentos.ts` y `CargaService.activo`). Los servicios exponen `Observable` para las operaciones HTTP.
- **Regla:** el estado de la UI es un `signal` y lo derivado es un `computed`; no se copia a mano. Para leer un `Observable` en un componente se prefiere `toSignal`. Si hace falta un `subscribe`, que sea para una acción puntual (enviar o guardar) y que no quede vivo después de destruir el componente (`takeUntilDestroyed`).
- **Valor derivado que la persona puede cambiar:** `linkedSignal`, no `signal` + `effect`. Ejemplo: `SubirDocumento.idTipoElegido` arranca con el `?tipo=` de la URL (`tipoPedidoEn`), se recalcula cuando cambian la URL o la lista de tipos, y en el medio conserva lo que se eligió en el select. La URL se lee del observable `queryParamMap` con `toSignal`, no del `snapshot`: si se navega a la misma pantalla con otro `?tipo=`, Angular reutiliza el componente.

### 2.7 Singleton (vía la DI de Angular)
- **Dónde:** los servicios de `core/` son una única instancia por app (`providedIn: 'root'` o provistos en `app.config.ts`). `CargaService` usa un contador para que dos esperas simultáneas no se pisen.
- **Regla:** el estado global vive solo en servicios de `core/`. **Nada de variables mutables a nivel de módulo** ni `static` para compartir estado.

### 2.8 Tabla de estrategias por clave (Strategy liviano / reemplazo de condicionales)
- **Dónde:** `APARIENCIA_POR_ESTADO: Record<EstadoDocumento, AparienciaEstado>` en `insignia-estado.ts`, con un valor por defecto (`APARIENCIA_DESCONOCIDA`) para un `estado` nulo o inesperado. También `enlacesPorSesion` (menú por rol), `destinoSegunRoles` y `rolPrincipalDe` (prioridad de roles).
- **Regla:** todo lo que cambia según el estado, el rol o el tipo se resuelve con **una tabla en un solo lugar**, nunca con `if` repetidos en cada pantalla. Siempre hay un caso por defecto, porque `estado` es `varchar NULL` en la BD.

### 2.9 Composite: árbol de componentes
- **Dónde:** `estructura-panel` (encabezado + menú lateral + contenido) contiene pantallas que a su vez contienen `tarjeta-metrica`, `insignia-estado`, `zona-archivo`, etc.
- **Regla:** se reusa `shared/ui/` en lugar de copiar HTML. Si dos features necesitan lo mismo, se extrae a `shared/ui/`. Una feature no importa componentes de otra feature.

### 2.10 Builder: formularios reactivos tipados
- **Dónde:** `FormBuilder` / `fb.nonNullable.group(...)` en los formularios (login, alta y edición de usuario, programa de materia).
- **Regla:** formularios siempre reactivos y tipados, con los validadores declarados en la construcción. El payload para la API lo arma el servicio (Adapter), no el template.

### 2.11 Fábricas simples (funciones puras que construyen objetos)
- **Dónde:** `enlacesPorSesion(...)`, `novedadesDelLegajo(...)`, `notificacionesPorRechazos(...)`, `contarPorEstado(...)`, `ultimasVersionesPorTipo(...)`, `validarArchivoPdf(...)`, `comentarioDeRechazo(...)`.
- **Regla:** la lógica de negocio del front (conteos, progreso, validaciones, armado de menús) va en **funciones puras en `core/`** con su `*.spec.ts`, no adentro del componente. Así se prueban sin `TestBed`.
- **Legajo completo (SCRUM-153):** `legajoEstaCompleto(...)` es la única definición de "legajo completo". La usan el aviso de la campana (`novedadesDelLegajo`) y el cartel de los paneles (`shared/ui/aviso-legajo-completo`). Mira la versión vigente de cada documento: progreso real, cada obligatorio aprobado, sin rechazos y sin vencidos (`estaVencido(...)`).
- **Documentación rechazada (SCRUM-152):** `rechazosVigentes(...)` (`core/legajos/rechazos-legajo.ts`) es la única definición de "tiene un rechazo". Devuelve cada rechazo de la versión vigente con su motivo y su tipo. La usan el aviso de la campana (`notificacionesPorRechazos`) y la tarjeta `shared/ui/documentos-rechazados` de los paneles; los dos abren "Subir Documento" con el tipo ya elegido.
- **Documentación por entregar (SCRUM-150):** `obligatoriosSinCargar(...)` es la única definición de "falta entregar" (la usan la campana, la tarjeta y el mapa del trámite). `requeridoDelDocumento(...)` encuentra el tipo de un documento del legajo por su nombre. `consultaConTipo(...)` y `tipoPedidoEn(...)` (`core/legajos/tipo-en-url.ts`) arman y validan el `?tipo=` de "Subir Documento", con el nombre del parámetro escrito en un solo lugar.

---

## 3. Patrones para lo que viene (Sprint 3 en adelante)

| Necesidad | Patrón sugerido | Cómo |
|---|---|---|
| **Calendario de exámenes:** día 🟢 libre / 🟡 1 examen / 🔴 completo | **State** (estados derivados) + tabla (§2.8) | Una función pura `estadoDelDia(examenes, fecha, comision)` devuelve `'Libre' \| 'UnExamen' \| 'Completo'` (máximo 2 por fecha y comisión). Una tabla `APARIENCIA_POR_DIA` define el color y si permite cargar. Servicio nuevo `core/examenes/` con abstracto + HTTP + mock (§2.1). |
| **Rechazo con motivo obligatorio** | Tabla de constantes + función pura | ✅ **Hecho en legajos (05/10/2026).** Catálogo único `MOTIVOS_RECHAZO` en `core/legajos/motivos-rechazo.ts` con los 7 motivos de la institución. En lugar de "Otro", hay una aclaración opcional. `comentarioDeRechazo(motivos, aclaracion)` arma el texto. El presentacional `mis-documentos/partes/cuadro-rechazo` no confirma sin al menos un motivo (CP23). 🔴 **Falta justificativos:** el catálogo es el mismo, pero hoy el PUT no recibe comentario (`docs/contrato-api.md`). |
| **Cambios sin guardar** ("Cargaste documentación nueva, debes Guardar…") | **Memento** liviano + guard (Chain) | Guardar una foto del valor inicial del formulario y compararla con la actual. Un `canDeactivate` reutilizable pregunta antes de salir. |
| **Requisitos de la contraseña nueva** (cambio de contraseña, CP35 y CP36) | **Strategy** por regla | Cada requisito es un objeto `{ texto, cumple(valor) }` en una lista. `requisitos-password` dibuja la lista y el botón se habilita cuando se cumplen todos. Si `core/auth/password.ts` ya lo resuelve así, se reusa y no se duplica. |
| **Listados de Director y Secretario** (filtros y búsqueda) | Funciones puras de filtro + Facade | El filtrado (activos o de baja, búsqueda por nombre o DNI) va en una función pura con test. El servicio expone los datos y el componente solo une signals. |
| **Endpoints que todavía no existen** (calendario) | Strategy (mock) + Adapter | Mock con el contrato acordado en `docs/contrato-*.md`. Cuando llega el endpoint real se cambia `useClass` y se ajusta el Adapter, sin tocar pantallas. |

---

## 4. Deuda detectada (para corregir cuando se toquen esos archivos)

1. **Conteo de estados duplicado.** `panel-docente.ts` (~líneas 90-92) y `mis-documentos.ts` (~líneas 280-282) cuentan con `filter(d => d.estado === '...')`, pero ya existe `contarPorEstado()` en `core/legajos/resumen-legajo.ts` (que además considera solo la última versión de cada tipo). Usar la función compartida.
2. **Estados como texto suelto.** Hay comparaciones con `'Aprobado'`, `'Pendiente'` y `'Rechazado'` repartidas en features. Conviene un único `EstadoDocumento` con sus constantes en `core/legajos/`; hoy el tipo está definido en `shared/ui/insignia-estado`. Las pantallas importarían de ahí.
3. **`mis-documentos.ts` tiene unas 580 líneas** y mezcla carga de datos, armado de filas, orden y auditoría. Candidato a separar en funciones puras en `core/legajos/` (armado y orden de filas) y a partir la UI en `partes/`. El primer paso ya está: el cuadro de rechazo vive en `partes/cuadro-rechazo` (05/10/2026).

> No se refactoriza "de paso": cada punto va en su propio commit `refactor:` con sus tests, sin mezclarlo con features.

---

## 5. Checklist de patrones para cada PR del front

- [ ] El componente nuevo inyecta servicios abstractos, nunca `*HttpService` ni `HttpClient`.
- [ ] Los tipos crudos de la API no salen de `*-http.service.ts` (Adapter).
- [ ] Las URLs están solo en `api.ts`, los roles solo en `rol.ts` y la apariencia por estado solo en `insignia-estado`.
- [ ] Lo que varía por estado, rol o tipo está en una tabla con caso por defecto, sin `if` repetidos.
- [ ] Contenedor y presentacional separados (`partes/`), con `input()` y `output()`.
- [ ] Estado con signals; sin suscripciones que queden vivas.
- [ ] La lógica de negocio está en funciones puras en `core/` con su spec.
- [ ] Sin `extends` entre componentes y sin copiar HTML que ya está en `shared/ui/`.
- [ ] Si se aplicó un patrón nuevo o se cambió uno existente, se actualizó este documento.

---

## 6. Alcance

Este documento cubre **el frontend**. En el backend los mismos principios llevarían a separar en capas (Clean Architecture), a usar servicios para el renombrado de archivos y el envío de mails en vez de hacerlo en los controllers, y a un Adapter entre entidades y DTOs. Eso se coordina con el equipo de backend: ver `CLAUDE_GUIDE_ISCGB-v2.md` §1.
