# Patrones de diseño en el frontend

Revisado contra el código el **06/10/2026**. El proyecto está en desarrollo: si este documento y el código no coinciden, manda el código. Actualizalo en el mismo cambio que agregue, quite o modifique un patrón.

La base teórica es *Sumérgete en los Patrones de Diseño*, de Alexander Shvets (Refactoring.Guru), que cubre los 22 patrones clásicos, los principios de diseño y SOLID. El libro tiene licencia de uso personal, así que no se sube al repo ni al Project. Esto es nuestra aplicación de esos conceptos a ISCGB; la teoría de cada patrón está en el libro o en refactoring.guru.

## 0. Cómo usar los patrones acá

Un patrón se usa porque resuelve un problema concreto del código. Si alcanza con una función pura o un `computed`, va eso.

Primero se respeta lo que ya existe. Los patrones del punto 2 están en el código y son obligatorios: el código nuevo los sigue y no inventa una forma paralela de hacer lo mismo.

Se nombra el patrón. Si aplicás uno, decilo en un comentario corto o en la descripción del PR, por ejemplo "Adapter: traduce `LegajoApi` a `DocumentoLegajo`". Así el equipo lo reconoce y QA sabe qué mirar.

Angular ya trae varios: la inyección de dependencias, los interceptores, los guards y los signals son patrones. Usalos en lugar de reimplementarlos a mano.

## 1. Principios de diseño

Son obligatorios.

**Encapsular lo que varía.** Lo que cambia seguido vive en un solo lugar: las URLs en `core/configuracion/api.ts`, los IDs de rol en `core/auth/modelos/rol.ts`, la apariencia por estado en `insignia-estado` y los menús por rol en `enlaces-por-rol.ts`.

**Programar contra una interfaz.** Los componentes dependen de las clases abstractas (`AuthService`, `LegajoService`) y nunca de un `*HttpService`. En un componente va `inject(LegajoService)`.

**Composición sobre herencia.** Las pantallas se arman combinando componentes de `shared/ui/`. No se usa `extends` entre componentes; la herencia queda para los servicios abstractos de `core/`.

**Responsabilidad única.** Un componente dibuja o coordina, un servicio habla con la API y una función pura calcula. Si un archivo mezcla las tres cosas o pasa las 300 líneas, se parte.

**Abierto y cerrado.** Agregar un estado, un rol o un tipo de documento no debería obligar a tocar muchos `if`. Se usan tablas de búsqueda (`Record<...>`) en vez de cadenas de `if` o `switch`.

**Sustitución de Liskov.** `AuthMockService` y `AuthHttpService` tienen que ser intercambiables sin que la pantalla lo note. El mock respeta las mismas firmas, tipos y mensajes de error.

**Segregación de interfaces.** Un presentacional recibe solo los `input()` que usa. No se le pasa la `Sesion` entera a un componente que muestra un nombre.

**Inversión de dependencias.** `app.config.ts` decide qué implementación se usa, con `useClass`. Cambiar el mock por el real se hace en un solo lugar, sin tocar componentes.

## 2. Patrones que ya están en el código

Hay que respetarlos.

### 2.1 Strategy + inversión de dependencias: servicios abstractos con implementación HTTP y mock

Cada dominio tiene `core/<dominio>/<dominio>.service.ts`, que es la clase abstracta, un `*-http.service.ts` y un `*-mock.service.ts`. Se eligen en `app.config.ts` con `{ provide: AuthService, useClass: AuthHttpService }`. Así están Auth, Legajo, Usuarios, Justificativos, Certificados, ProgramasMateria, ReconocimientoSaberes, Materias, FrecuenciaAvisos (`core/notificaciones/`) y Examenes (`core/examenes/`, el calendario y su límite por día).

Todo dominio nuevo sigue el mismo trío. Si el endpoint todavía no existe, se arranca con el mock.

### 2.2 Adapter: respuesta cruda de la API → modelo limpio

`RespuestaLogin` se convierte en `Sesion` en `auth-http.service.ts` (método `aSesion`). Los tipos `*Api` de `legajo-http.service.ts` se mapean a los modelos de `core/legajos/modelos/`. Los errores pasan por `core/comun/error-api.ts` (`mensajeDelServidor`, `esEndpointInexistente`).

Los tipos crudos de la API, con sus nombres mezclados como `estado_usuario` o `lugar_Nacimiento`, **no salen de `*-http.service.ts`**. Un componente nunca ve un `*Api` ni un `HttpErrorResponse`: ve modelos limpios y mensajes en español.

### 2.3 Facade: el servicio de dominio esconde HTTP, mapeo y errores

Cada servicio de `core/` expone operaciones del negocio (`auditar(...)`, `iniciarSesion(...)`) y esconde las URLs, el multipart y la traducción de errores. `CargaService` hace lo mismo con el loader global.

**Ningún componente de `features/` ni de `shared/` inyecta `HttpClient`.** Si una pantalla necesita un dato nuevo, se agrega un método al servicio de dominio.

### 2.4 Chain of Responsibility: interceptores y guards

En `app.config.ts` está `withInterceptors([tokenInterceptor, sesionInterceptor, cargaInterceptor])`. Cada eslabón hace una sola cosa y le pasa la petición al siguiente:

- `tokenInterceptor` agrega el `Bearer`.
- `sesionInterceptor` trata el 401 como sesión vencida y el 403 como acceso denegado.
- `cargaInterceptor` maneja el loader global, que se puede apagar con `SIN_CARGA_GLOBAL`.

En las rutas, `authGuard` y `roleGuard(...roles)` encadenan las validaciones.

Lo transversal a todas las peticiones va como interceptor, no repetido en cada servicio. El orden importa: si agregás uno, documentá en `app.config.ts` por qué va en esa posición.

### 2.5 Mediator: contenedor y presentacional

`Login` coordina a `FormularioLogin` y `PanelBienvenida`, que no se conocen entre sí. Los hijos van en `partes/`.

Solo el contenedor inyecta servicios. Los presentacionales se comunican por `input()` y `output()`, la API actual de Angular; no se usa `@Input` ni `@Output`.

### 2.6 Observer: signals y RxJS

En todo el front hay `signal`, `computed` y `toSignal`, por ejemplo en `mis-documentos.ts` y en `CargaService.activo`. Los servicios exponen `Observable` para las operaciones HTTP.

El estado de la UI es un `signal` y lo derivado es un `computed`; no se copia a mano. Para leer un `Observable` en un componente se prefiere `toSignal`. Si hace falta un `subscribe`, que sea para una acción puntual, como enviar o guardar, y que no quede vivo después de destruir el componente (`takeUntilDestroyed`).

**Pedido con fases (State liviano).** Cuando una pantalla tiene que distinguir cargando, error y listo, el pedido se modela como una unión discriminada por `fase`, y no como tres signals sueltos que pueden contradecirse. `cargarLegajoPropio(...)`, en `core/legajos/legajo-propio.ts`, devuelve `LegajoPropio`: `cargando`, `error` con su mensaje o `listo` con los datos. Nunca falla: el error es una fase más, así `toSignal` no lanza al dibujar. El contenedor lo lee con `toSignal` y un `Subject` de reintento (`startWith` más `switchMap`). El presentacional recibe la `fase` por `input()` y resuelve qué dibujar con una tabla por clave, como `documentacion-por-entregar`. La pantalla "Frecuencia de avisos" sigue el mismo criterio con `CargaFrecuencia`, y el calendario de exámenes con `CargaMes`, cuya fase `listo` guarda el mes al que pertenecen los datos. Ahí el pedido depende de un `signal` con el mes que se mira: `toObservable` más `switchMap` descartan la respuesta de un mes que ya no está en pantalla.

**Valor derivado que la persona puede cambiar.** Va con `linkedSignal`, no con `signal` más `effect`. `SubirDocumento.idTipoElegido` arranca con el `?tipo=` de la URL (`tipoPedidoEn`), se recalcula cuando cambian la URL o la lista de tipos, y en el medio conserva lo que se eligió en el select. La URL se lee del observable `queryParamMap` con `toSignal` y no del `snapshot`, porque si se navega a la misma pantalla con otro `?tipo=` Angular reutiliza el componente.

### 2.7 Singleton, vía la inyección de dependencias de Angular

Los servicios de `core/` son una única instancia por app, con `providedIn: 'root'` o provistos en `app.config.ts`. `CargaService` usa un contador para que dos esperas simultáneas no se pisen.

El estado global vive solo en servicios de `core/`. Nada de variables mutables a nivel de módulo ni `static` para compartir estado.

### 2.8 Tabla de estrategias por clave

Es un Strategy liviano, que reemplaza condicionales. El ejemplo es `APARIENCIA_POR_ESTADO: Record<EstadoDocumento, AparienciaEstado>` en `insignia-estado.ts`, con `APARIENCIA_DESCONOCIDA` como valor por defecto para un `estado` nulo o inesperado. También lo son `enlacesPorSesion` para el menú, `destinoSegunRoles`, `rolPrincipalDe` y `APARIENCIA_POR_DIA`, que le da a cada estado del calendario su fondo, su barrita y su candado.

Todo lo que cambia según el estado, el rol o el tipo se resuelve con una tabla en un solo lugar, nunca con `if` repetidos en cada pantalla. Siempre hay un caso por defecto, porque `estado` es `varchar NULL` en la base.

### 2.9 Composite: árbol de componentes

`estructura-panel`, con el encabezado, el menú lateral y el contenido, contiene pantallas que a su vez contienen `tarjeta-metrica`, `insignia-estado`, `zona-archivo` y demás.

Se reusa `shared/ui/` en lugar de copiar HTML. Si dos features necesitan lo mismo, se extrae a `shared/ui/`. Una feature no importa componentes de otra feature.

### 2.10 Builder: formularios reactivos tipados

Los formularios usan `FormBuilder`, casi siempre `fb.nonNullable.group(...)`: login, alta y edición de usuario, programa de materia y frecuencia de avisos.

Son siempre reactivos y tipados, con los validadores declarados en la construcción. El cuerpo para la API lo arma el servicio, no el template.

### 2.11 Fábricas simples: funciones puras que construyen objetos

Son `enlacesPorSesion(...)`, `novedadesDelLegajo(...)`, `notificacionesPorRechazos(...)`, `contarPorEstado(...)`, `ultimasVersionesPorTipo(...)`, `validarArchivoPdf(...)`, `comentarioDeRechazo(...)` y, para el calendario, `estadoDelDia(...)` y `semanasDelMes(...)`, entre otras.

La lógica de negocio del front, como conteos, progreso, validaciones y armado de menús, va en funciones puras en `core/`, con su `*.spec.ts`, y no adentro del componente. Así se prueban sin `TestBed`.

Tres de ellas son la única definición de algo, para que la campana y los paneles nunca muestren cosas distintas:

- `obligatoriosSinCargar(...)` define qué falta entregar. La usan la campana, la tarjeta "Documentación por entregar" y el mapa del trámite.
- `rechazosVigentes(...)`, en `core/legajos/rechazos-legajo.ts`, define qué es un rechazo sin corregir. Devuelve cada uno con su motivo y su tipo. La usan la campana y la tarjeta `shared/ui/documentos-rechazados`.
- `legajoEstaCompleto(...)` define cuándo el legajo está completo: progreso real, cada obligatorio aprobado en su versión vigente, sin rechazos y sin vencidos. La usan la campana y el cartel `shared/ui/aviso-legajo-completo`.

`requeridoDelDocumento(...)` encuentra el tipo de un documento del legajo por su nombre. `consultaConTipo(...)` y `tipoPedidoEn(...)`, en `core/legajos/tipo-en-url.ts`, arman y validan el `?tipo=` de "Subir Documento", con el nombre del parámetro escrito en un solo lugar.

## 3. Patrones para lo que viene

**Calendario de exámenes.** Hecho el 10/10/2026 (SCRUM-183), solo la consulta: la pantalla muestra un mes con el estado de cada día y deja pasar de mes. Registrar, modificar y eliminar exámenes no está.

La regla es la del backend: hay un límite de exámenes por día, único para todo el instituto, que define Secretaría Académica y hoy vale 2. No hay límite por comisión. Cada día está en uno de tres estados, `Libre`, `ConExamenes` o `Completo`. Quien decide si un día está completo es el backend (`limiteAlcanzado`); el front no vuelve a compararlo con la cantidad.

Cómo está armado:

- `core/examenes/` tiene el trío de siempre: `ExamenesService` (abstracto), `ExamenesHttpService`, que traduce `estado-mes` al modelo `EstadoMes` sin correr la fecha un día (`desdeFechaSola`), y `ExamenesMockService`, que no se registra.
- `core/examenes/calendario-mes.ts` reúne las funciones puras, con su spec. `estadoDelDia(...)` devuelve el estado de un día. `semanasDelMes(...)` arma la grilla de lunes a domingo, con días de relleno de los meses vecinos (que no tienen estado) y recibiendo "hoy" por parámetro. También están el cambio de mes con salto de año, el título y la leyenda según el límite.
- `features/calendario/calendario-examenes/` es el contenedor, el único que conoce el servicio. Sus presentacionales están en `partes/`: `cabecera-mes`, `calendario-mes` (leyenda, tabla y nota del límite) y `celda-dia`, que es un `td` y no un elemento propio para no romper la tabla. La tabla por clave `APARIENCIA_POR_DIA` vive en `celda-dia.ts`.
- `features/secretario/limite-examenes/` es la pantalla donde Secretaría fija el límite por día, gemela de "Frecuencia de avisos": mismo contenedor con fases (`CargaLimite`) y un formulario en `partes/formulario-limite`. Lee el límite con `ExamenesService.limiteDiario()` y lo guarda con `guardarLimiteDiario(...)`; la validación (entero de 1 a 99) es una función pura en `core/examenes/limite-diario.ts`.

El color no es lo único que distingue un estado: la celda lleva además una etiqueta, y en pantallas chicas la cantidad en número o el candado. El texto va en `text-texto` y el color en la barrita, el fondo y el candado, porque `aprobado` y `pendiente` como texto no llegan a contraste AA.

Lo que necesita que el backend liste los exámenes (la agenda del mes y la materia en cada celda) quedó fuera. Los pendientes están en `docs/contrato-api.md`.

**Rechazo con motivo obligatorio.** Hecho en legajos el 05/10/2026: el catálogo único `MOTIVOS_RECHAZO`, en `core/legajos/motivos-rechazo.ts`, tiene los 7 motivos de la institución, con una aclaración opcional en lugar de "Otro". `comentarioDeRechazo(motivos, aclaracion)` arma el texto y el presentacional `mis-documentos/partes/cuadro-rechazo` no confirma sin al menos un motivo (CP23). **Falta en justificativos:** el catálogo es el mismo, pero el PUT no recibe comentario.

**Cambios sin guardar.** Memento liviano más un guard: se guarda una foto del valor inicial del formulario, se compara con la actual, y un `canDeactivate` reutilizable pregunta antes de salir. Ya lo usa la entrega del programa de materia, con `confirmarSalidaGuard`.

**Requisitos de la contraseña nueva**, para el cambio de contraseña (CP35 y CP36). Strategy por regla: cada requisito es un objeto `{ texto, cumple(valor) }` en una lista, `requisitos-password` la dibuja y el botón se habilita cuando se cumplen todos. Si `core/auth/password.ts` ya lo resuelve así, se reusa.

**Listados de Director y Secretario.** El filtrado por estado de la cuenta y la búsqueda por nombre o DNI van en una función pura con test; el servicio expone los datos y el componente solo une signals. El de Secretaría ya está, con `core/usuarios/filtrar-usuarios.ts`.

**Endpoints que todavía no existen.** Se arranca con un mock que respeta el contrato acordado en `docs/contrato-*.md`. Cuando llega el endpoint real se cambia `useClass` y se ajusta el Adapter, sin tocar pantallas.

## 4. Deuda detectada

Para corregir cuando se toquen esos archivos.

1. El conteo de estados está duplicado. `panel-docente.ts` y `mis-documentos.ts` cuentan con `filter(d => d.estado === '...')`, cuando ya existe `contarPorEstado()` en `core/legajos/resumen-legajo.ts`.
2. Los estados andan como texto suelto. Hay comparaciones con `'Aprobado'`, `'Pendiente'` y `'Rechazado'` repartidas por las features. Conviene un único `EstadoDocumento` con sus constantes en `core/legajos/`; hoy el tipo está en `shared/ui/insignia-estado`.
3. `mis-documentos.ts` tiene unas 600 líneas y mezcla la carga de datos, el armado de filas, el orden y la auditoría. Es candidato a separar en funciones puras en `core/legajos/` y a partir la UI en `partes/`. El primer paso ya está: el cuadro de rechazo vive en `partes/cuadro-rechazo`.
4. La barra de progreso de los paneles cuenta un documento como aprobado si alguna de sus versiones lo está, mientras que `legajoEstaCompleto` mira solo la vigente. Con un anual vencido y vuelto a subir, la barra dice 100 % y el cartel de legajo completo no aparece.

No se refactoriza de paso: cada punto va en su propio commit `refactor:`, con sus tests y sin mezclarlo con features.

## 5. Checklist para cada PR del front

- [ ] El componente nuevo inyecta servicios abstractos, nunca un `*HttpService` ni `HttpClient`.
- [ ] Los tipos crudos de la API no salen de `*-http.service.ts`.
- [ ] Las URLs están solo en `api.ts`, los roles solo en `rol.ts` y la apariencia por estado solo en `insignia-estado`.
- [ ] Lo que varía por estado, rol o tipo está en una tabla con caso por defecto, sin `if` repetidos.
- [ ] Contenedor y presentacional separados, con `input()` y `output()`.
- [ ] Estado con signals, sin suscripciones que queden vivas.
- [ ] La lógica de negocio está en funciones puras en `core/`, con su spec.
- [ ] Sin `extends` entre componentes y sin copiar HTML que ya está en `shared/ui/`.
- [ ] Si se aplicó un patrón nuevo o se cambió uno, se actualizó este documento.

## 6. Alcance

Este documento cubre el frontend. En el backend los mismos principios llevarían a separar en capas, a usar servicios para el renombrado de archivos y el envío de mails en vez de hacerlo en los controllers, y a un Adapter entre entidades y DTO. Eso se coordina con el equipo de backend: ver `CLAUDE_GUIDE_ISCGB-v2.md` §1.
