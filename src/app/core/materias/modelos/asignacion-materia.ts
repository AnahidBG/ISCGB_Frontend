/**
 * Lo que necesita "Materias y asignaciones" además de las materias: quién
 * puede dictarlas, en qué comisión, y lo que se manda al guardar.
 *
 * Todo sale de `MateriasController` (ruta `api/Materias`).
 */

/** Un docente para el desplegable. `idDocente` es el de la tabla `Docentes`, no el de `Usuarios`. */
export interface DocenteDisponible {
  idDocente: number;
  nombreCompleto: string;
}

/** Una comisión (cursada/horario) para el desplegable. El backend la llama `nombreComision`. */
export interface ComisionDisponible {
  idComision: number;
  nombre: string;
}

/**
 * Un alumno para el desplegable (`GET /api/Materias/alumnos-disponibles`).
 * `idAlumno` es el de la tabla `Alumnos`, no el de `Usuarios`. El backend arma
 * el nombre como "Apellido, Nombre (Legajo: X)".
 */
export interface AlumnoDisponible {
  idAlumno: number;
  nombreCompleto: string;
}

/** `AsignarMateriaAlumnoDto`: en qué materia y comisión se inscribe un alumno (SCRUM-248). */
export interface InscripcionAlumno {
  idAlumno: number;
  idMateria: number;
  idComision: number;
}

/** `AsignarMateriaDto`: qué docente dicta qué materia en qué comisión. */
export interface AsignacionMateria {
  idDocente: number;
  idMateria: number;
  idComision: number;
}

/**
 * `CargarMateriaDto`. Los tres son obligatorios: en el DTO son `string` (no
 * `string?`) con `<Nullable>enable</Nullable>`, así que el backend responde
 * 400 si llegan vacíos.
 */
export interface NuevaMateria {
  nombre: string;
  carrera: string;
  curso: string;
}
