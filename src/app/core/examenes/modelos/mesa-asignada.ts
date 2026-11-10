import { RolMesa } from '../../mesas/rol-mesa';

/** Una mesa de examen a la que asignaron al docente y que todavía no respondió. */
export interface MesaAsignada {
  idExamen: number;
  materia: string;
  /** El día y la hora del examen, en hora local: no se corre por la zona horaria. */
  fecha: Date;
  /** Su lugar en el tribunal. No viene si el backend es anterior al 10/11/2026. */
  rol?: RolMesa;
}
