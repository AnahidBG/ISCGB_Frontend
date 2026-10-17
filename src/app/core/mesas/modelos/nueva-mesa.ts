/**
 * Una mesa de examen que arma Dirección o Secretaría, con el docente que la
 * preside (`RegistrarMesaDto`).
 */
export interface NuevaMesa {
  /** "2026-11-20": el día, sin hora ni zona. */
  dia: string;
  /** "09:00": la hora en formato de 24 h. */
  horario: string;
  idMateria: number;
  idComision: number;
  /** "Final", "Coloquio"…: uno de `tipos-examen`. */
  idTipoExamen: number;
  /** El de la tabla `Docentes`, no el de `Usuarios`. */
  idDocente: number;
}
