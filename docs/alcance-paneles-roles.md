# Alcance de los paneles de Secretario, Docente y Alumno

Analizado el 26/08/2026, en el Sprint 1, y actualizado el **06/10/2026**.
Continúa `docs/alcance-dashboard-director.md` con las mismas tres preguntas.

Los tres paneles arrancaron maquetados con datos falsos, porque estaban en el
roadmap pero no había endpoints. El 27/08 apareció `LegajosController` y desde
el 30/08 todo lo que muestran sale de la API.

## Panel del Docente y del Alumno

Muestran el legajo propio (`GET /api/Legajos/usuario/{id}`) y el progreso de
entrega.

El progreso es documentos aprobados sobre documentos obligatorios del rol. Los
obligatorios salen de `GET /api/Legajos/requeridos-por-rol/{idRol}`, que lee la
tabla `roles_tipos_documentos`. Al principio se calculaba como aprobados sobre
cargados, que daba un número optimista porque no contaba lo que faltaba subir.
Si no se sabe qué le pide el instituto al rol, el panel lo marca como
aproximado.

Arriba de todo va lo que pide hacer algo: los documentos rechazados con su
motivo, la documentación que falta entregar y, cuando corresponde, el aviso de
legajo completo.

El Alumno tiene además los accesos al certificado de alumno regular, al
reconocimiento de saberes y a justificar una inasistencia. El enlace a SIAADE
no tiene URL definida con el instituto y es del Sprint 3.

## Panel del Secretario

Lista los justificativos de inasistencia que esperan revisión
(`GET /api/Justificativos/pendientes`) y permite aprobarlos o rechazarlos.

Secretaría tiene también `/secretario/listados`, con alumnos y docentes,
búsqueda por nombre, DNI o correo y filtros por rol y estado de la cuenta. Usa
`GET /api/Usuarios`, sin un endpoint paralelo.

## Dónde se aprueba o se rechaza un documento del legajo

En un primer momento no se construyeron los botones. Cambiar a "Aprobado" un
documento de mentira no probaba nada y daba la sensación de que el flujo ya
funcionaba.

Hoy la revisión está en el legajo de cada persona
(`/legajo/usuario/:idUsuario`), al que se llega desde Control de Legajos. Usa
`PUT /api/Legajos/auditar/{idLegajo}` y exige un motivo para rechazar.

**El backend todavía no manda el mail de rechazo** que pide la regla de negocio
4: `AuditarLegajo` guarda el estado, el comentario y el auditor, y nada más.

## `LegajoService`

Responde dos preguntas distintas con el mismo contrato: el legajo de una
persona (`obtenerLegajoPropio`, `obtenerLegajoDeUsuario`) y los documentos de
todo el instituto (`obtenerResumenUsuarios`, que usa Control de Legajos).

Está separado de `UsuariosService` porque uno lista documentos y el otro lista
personas.

## A qué panel va cada sesión

Lo decide `destinoSegunRoles`: Director a `/director/panel`, Secretario a
`/secretario/panel`, Docente a `/docente/panel` y Alumno a `/alumno/panel`. Con
más de un rol gana el de mayor alcance, en ese orden.

Sin ningún rol va a `/inicio`, que es también adonde `roleGuard` manda a quien
entra a una pantalla que no es suya.

## Un riesgo conocido

`GET /api/Legajos/usuario/{id}` devuelve el nombre del tipo de documento y no
su id. El frontend cruza por nombre contra los obligatorios del rol, así que
corregir una tilde en `tipos_documentos` cambia el cálculo. Si el backend
agrega `idTipoDoc` a esa respuesta, el cruce pasa a ser por id.

## Pendientes del backend

1. Que `PUT /api/Legajos/auditar/{id}` mande el mail de rechazo.
2. Un endpoint liviano con los conteos por persona. Hoy Control de Legajos pide
   `GET /api/Legajos/resumen-estado`, que trae el legajo de todo el instituto,
   y cuenta en el navegador.
3. Agregar `idTipoDoc` a la respuesta del legajo de una persona.
