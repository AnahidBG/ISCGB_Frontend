import { RolMesa } from '../rol-mesa';

/** Una mesa de examen que un docente rechazó y que hay que reasignar. */
export interface AlertaRechazo {
  idExamen: number;
  /** El docente que la rechazó (tabla `Docentes`). Junto con `idExamen` identifica la alerta. */
  idDocente: number;
  /** "Nombre Apellido" de quien la rechazó. */
  docente: string;
  materia: string;
  /** El día y la hora del examen, en hora local: no se corre por la zona horaria. */
  fecha: Date;
  /**
   * El lugar del tribunal que quedó libre: el que hay que cubrir al reasignar.
   * No viene si el backend es anterior al 10/11/2026.
   */
  rol?: RolMesa;
}
