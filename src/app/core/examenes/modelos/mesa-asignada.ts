/** Una mesa de examen a la que asignaron al docente y que todavía no respondió. */
export interface MesaAsignada {
  idExamen: number;
  materia: string;
  /** El día y la hora del examen, en hora local: no se corre por la zona horaria. */
  fecha: Date;
}
