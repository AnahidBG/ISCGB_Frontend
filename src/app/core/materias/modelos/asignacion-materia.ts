/**
 * Lo que necesita "Materias y asignaciones" además de las materias: quién
 * puede dictarlas, en qué comisión, y lo que se manda al guardar.
 *
 * Todo sale de `AsignacionesController` (ruta `api/Asignaciones`).
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
