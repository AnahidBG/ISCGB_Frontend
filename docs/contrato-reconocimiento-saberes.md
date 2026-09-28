# Contrato propuesto: reconocimiento de saberes

> **Sprint 2** — SCRUM-30 "Solicitar Reconocimiento de Saberes"
> Subtareas: SCRUM-172 (frontend) · SCRUM-173 (backend, "Por hacer")
> **Fecha:** 28/09/2026

La pantalla del alumno ya está hecha (`/alumno/reconocimiento-saberes`). El
backend todavía **no tiene controlador**: la tabla `reconocimiento_saberes`
existe (`id_solicitud, id_materia, id_alumno, id_docente, comentario`), pero
no hay endpoint ni lugar para guardar los PDF. Mientras tanto la pantalla
responde *"El sistema todavía no recibe solicitudes… presentá esta
documentación en Secretaría"*.

Este es el contrato que la pantalla espera. Sigue el mismo criterio que
`POST /api/Justificativos/cargar`, que ya funciona.

## `POST /api/ReconocimientoSaberes`

`multipart/form-data`:

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `idUsuario` | int | Sí | El usuario de la sesión. El backend busca su fila en `Alumnos`. |
| `materiaIscgb` | string | Sí | Texto libre: no existe `GET /api/Materias` para elegirla de una lista. |
| `comentario` | string | No | Criterio: "en la sección de la materia de ISCGB debe estar la opción de escribir un comentario". |
| `programaOtraInstitucion` | archivo | Sí | PDF. |
| `analitico` | archivo | Sí | PDF (analítico / rendimiento académico). |

### Respuesta

| Situación | Código | Cuerpo |
|---|---|---|
| OK | `200` | `{ "message": "..." }` (opcional; si no viene, el front muestra el suyo) |
| Falta un campo / no es PDF | `400` | `{ "message": "..." }` — el front lo muestra tal cual |
| El usuario no es alumno | `404` | `{ "message": "..." }` |

## Lo que tiene que hacer el backend

1. **Validar PDF por contenido** (magic bytes `%PDF-`), no por extensión —
   regla de negocio #1.
2. **Renombrar** los dos archivos con `ISCGB_NombreyApellido_NombreDocumento`
   (p. ej. `ISCGB_MariaGomez_ProgramaOtraInstitucion.pdf`) — regla #2. La
   lógica ya existe en `LegajosController`.
3. **Guardar las rutas**: la tabla no tiene columnas para los archivos.
   Sugerencia: `ruta_programa` y `ruta_analitico` en `reconocimiento_saberes`.
4. **`id_materia` es NOT NULL**: o se publica `GET /api/Materias` (y el front
   cambia el campo de texto por un desplegable), o la columna pasa a
   anulable y se guarda `materiaIscgb` como texto.
5. **Que llegue a Secretaría** (SCRUM-177/179): como mínimo, un
   `GET /api/ReconocimientoSaberes/pendientes` para listarlas. Lo que pasa
   después entre las partes queda fuera del MVP (ISCGB-PROJECT.md).
6. `[Authorize(Roles = "Alumno")]`.
