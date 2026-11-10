/** Un examen del calendario, con lo que hace falta para mostrarlo en el día. */
export interface ExamenCalendario {
  idExamen: number;
  /** "2026-10-13": solo la fecha, sin hora ni zona. */
  fecha: string;
  /** "09:00": la hora en formato de 24 h. Precarga el formulario y se conserva al arrastrar. */
  horario: string;
  /** El nombre de la materia. */
  materia: string;
  /** El nombre de la comisión: "Comisión 1° A". */
  comision: string;
  /** El tipo de examen: "Parcial", "Final". */
  tipo: string;
  /**
   * Si quien mira lo puede modificar, mover o eliminar. Lo decide el backend
   * (`ExamenMesDto.PuedeModificar`, desde el 10/11/2026): Dirección y
   * Secretaría siempre; un docente, solo el Parcial, Recuperatorio o Final que
   * cargó él.
   */
  puedeModificar: boolean;
}
