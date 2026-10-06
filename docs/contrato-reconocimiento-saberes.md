# Contrato: reconocimiento de saberes

Sprint 2, historia SCRUM-30 "Solicitar Reconocimiento de Saberes" (SCRUM-172
en el frontend, SCRUM-173 en el backend). Actualizado el **06/10/2026** contra
`ReconocimientoSaberesController.cs`, en `main` del backend.

Hasta el 03/10/2026 este documento era un contrato propuesto desde el frontend:
`POST /api/ReconocimientoSaberes`, con la materia como texto. El backend publicó
otro y el frontend se alineó a ese.

## Lo que usa el alumno

### `GET /api/Materias/materias-disponibles`

Llena el desplegable "¿Qué materia querés que te reconozcan?". No pide
autenticación.

```json
{ "data": [{ "idMateria": 14, "nombreMateria": "Didáctica General" }] }
```

Hasta el 06/10/2026 el frontend lo pedía en
`/api/Asignaciones/materias-disponibles`, una ruta que dejó de existir cuando
el backend unificó todo en `MateriasController`.

### `POST /api/ReconocimientoSaberes/solicitar`

Solo para el rol Alumno. Es `multipart/form-data` (`SolicitudReconocimientoDto`):

| Campo | Tipo | Obligatorio | Notas |
| --- | --- | --- | --- |
| `idMateria` | int | Sí | Sale del desplegable; ya no es texto libre |
| `comentario` | string | No | Lo pide el criterio de aceptación |
| `programaPdf` | archivo | Sí | PDF, hasta 10 MB |
| `analiticoPdf` | archivo | Sí | PDF, hasta 10 MB. Es el analítico o rendimiento académico |

El alumno no viaja en el cuerpo: el backend lo saca del token.

Respuestas:

- `200` con `{ "mensaje": "Solicitud enviada a Secretaría/Preceptoria con éxito." }`.
  La clave es `mensaje`, en español.
- `400` con un texto suelto si algún archivo no es PDF o pesa más de 10 MB. El
  front lo muestra tal cual.
- `400 "El usuario no es un alumno."`
- `401 "Token inválido."` si no se pudo identificar al alumno.
- `500` con un texto suelto si no se pudieron guardar los PDF. El backend borra
  la solicitud a medias.

Los archivos quedan en `wwwroot/uploads/reconocimientos/` como
`programa_{idSolicitud}.pdf` y `analitico_{idSolicitud}.pdf`.

## Lo que usa Secretaría

Los cuatro endpoints son solo para el rol Secretario. La pantalla "Solicitudes
de reconocimiento" (`features/secretario/solicitudes-reconocimiento/`) usa el
listado y los dos PDF.

- `GET /api/ReconocimientoSaberes/recibirSolicitudReconocimiento`: las
  solicitudes sin docente asignado, con `idSolicitud`, `alumnoNombreCompleto`,
  `dni`, `materiaSolicitada`, `comentario`, `urlProgramaPdf` y
  `urlAnaliticoPdf`.
- `GET /api/ReconocimientoSaberes/{id}`: el detalle de una, con `nombre`,
  `apellido`, `dni`, `materia`, `comentario` y las dos URL. El frontend no lo
  usa.
- `GET /api/ReconocimientoSaberes/{id}/programa`: el PDF del programa.
- `GET /api/ReconocimientoSaberes/{id}/analitico`: el PDF del analítico.

## Pendientes del backend

1. Validar el PDF por contenido (magic bytes `%PDF-`) y no por `ContentType`,
   que lo manda el navegador. Es la regla de negocio 1.
2. Renombrar los archivos como `ISCGB_NombreyApellido_NombreDocumento`, que es
   la regla 2. Hoy quedan como `programa_{id}.pdf`.
3. Dirección no puede ver las solicitudes: los GET son solo de Secretario.
4. Los GET de Secretaría filtran por `IdDocente == null`, pero no hay endpoint
   que asigne el docente. Una solicitud nunca sale de pendiente.

Ya resuelto: `EnviarSolicitud` buscaba el claim `"id"` y respondía siempre
`401`. Ahora lee `ClaimTypes.NameIdentifier`, igual que `CertificadosController`.
