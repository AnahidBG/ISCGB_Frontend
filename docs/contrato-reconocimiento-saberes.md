# Contrato: reconocimiento de saberes

> **Sprint 2** — SCRUM-30 "Solicitar Reconocimiento de Saberes"
> Subtareas: SCRUM-172 (frontend) · SCRUM-173 (backend)
> **Actualizado:** 04/10/2026, contra `ReconocimientoSaberesController.cs`
> (PR #23 del backend, en `main`)

Hasta el 03/10/2026 este documento era un contrato **propuesto** desde el
frontend (`POST /api/ReconocimientoSaberes` con la materia como texto). El
backend publicó **otro** contrato y el frontend se alineó a ese.

## Lo que usa el alumno

### `GET /api/Asignaciones/materias-disponibles`

Llena el desplegable "¿Qué materia querés que te reconozcan?". Sin
autenticación. La clase es `AsignacionesController` (archivo
`MateriasController.cs`).

```json
{ "data": [{ "idMateria": 14, "nombreMateria": "Didáctica General" }] }
```

### `POST /api/ReconocimientoSaberes/solicitar`

`[Authorize(Roles = "Alumno")]`. `multipart/form-data`
(`SolicitudReconocimientoDto`):

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `idMateria` | int | Sí | Sale del desplegable. Ya no es texto libre. |
| `comentario` | string | No | Criterio: "en la sección de la materia de ISCGB debe estar la opción de escribir un comentario". |
| `programaPdf` | archivo | Sí | PDF, hasta 10 MB. |
| `analiticoPdf` | archivo | Sí | PDF, hasta 10 MB (analítico / rendimiento académico). |

El alumno **no** viaja en el cuerpo: el backend lo saca del token.

| Situación | Código | Cuerpo |
|---|---|---|
| OK | `200` | `{ "mensaje": "Solicitud enviada a Secretaría/Preceptoria con éxito." }` (`mensaje`, en español) |
| Algún archivo no es PDF o pesa más de 10 MB | `400` | Texto suelto — el front lo muestra tal cual |
| El usuario no es alumno | `400` | `"El usuario no es un alumno."` |
| No se pudo identificar al alumno | `401` | `"Token inválido."` — ⚠️ ver el bug de abajo |
| No se pudieron guardar los PDF | `500` | Texto suelto; el backend borra la solicitud a medias |

Los archivos quedan en `wwwroot/uploads/reconocimientos/` como
`programa_{idSolicitud}.pdf` y `analitico_{idSolicitud}.pdf`.

## Lo que ya tiene el backend para Secretaría (sin pantalla todavía)

Todos con `[Authorize(Roles = "Secretario")]`:

| Endpoint | Devuelve |
|---|---|
| `GET /api/ReconocimientoSaberes/recibirSolicitudReconocimiento` | Las solicitudes sin docente asignado: `idSolicitud`, `alumnoNombreCompleto`, `dni`, `materiaSolicitada`, `comentario`, `urlProgramaPdf`, `urlAnaliticoPdf` |
| `GET /api/ReconocimientoSaberes/{id}` | El detalle de una: `nombre`, `apellido`, `dni`, `materia`, `comentario` y las dos URL |
| `GET /api/ReconocimientoSaberes/{id}/programa` | El PDF del programa |
| `GET /api/ReconocimientoSaberes/{id}/analitico` | El PDF del analítico |

## Pendientes del backend

1. 🔴 **Bug bloqueante: el alumno no se puede identificar.** `EnviarSolicitud`
   busca el claim `"id"`, pero el JWT que arma `AuthController` pone el id en
   `ClaimTypes.NameIdentifier`. Resultado: **siempre** responde
   `401 "Token inválido."`, y como es un 401, el `sesionInterceptor` del
   frontend cierra la sesión del alumno. Arreglo (una línea, igual que
   `CertificadosController`):
   `User.FindFirst(ClaimTypes.NameIdentifier)?.Value`.
2. **Validar PDF por contenido** (magic bytes `%PDF-`), no por `ContentType`,
   que lo manda el navegador — regla de negocio #1.
3. **Renombrar** los archivos con `ISCGB_NombreyApellido_NombreDocumento` —
   regla #2. Hoy quedan como `programa_{id}.pdf`.
4. Dirección no puede ver las solicitudes: los GET son solo de `Secretario`.
5. Los GET de Secretaría filtran por `IdDocente == null`, pero no hay
   endpoint que asigne el docente: una solicitud nunca sale de "pendiente".
