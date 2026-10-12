/** Un examen para registrar en el calendario, tal como lo completa el docente. */
export interface NuevoExamen {
  /** "2026-10-13": solo el día, sin hora ni zona. */
  dia: string;
  /** "09:00": la hora en formato de 24 h. */
  horario: string;
  idMateria: number;
  idComision: number;
  idTipoExamen: number;
}
