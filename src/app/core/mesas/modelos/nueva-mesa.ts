/**
 * Una mesa de examen que arma Dirección o Secretaría, con su tribunal: el
 * docente que la preside y los dos vocales.
 *
 * Va entera en `RegistrarMesaDto`. El backend guarda el lugar de cada uno
 * (`rol`: "Presidente", "Vocal 1", "Vocal 2"); los tres quedan convocados
 * ("Pendiente") y cada uno acepta o rechaza por su cuenta.
 *
 * No lleva comisión ni tipo: desde el 10/11/2026 la mesa es de la materia para
 * TODAS sus comisiones, y el backend la guarda siempre como "Mesa de Examen".
 */
export interface NuevaMesa {
  /** "2026-11-20": el día, sin hora ni zona. */
  dia: string;
  /** "09:00": la hora en formato de 24 h. */
  horario: string;
  /** La materia, y con ella el año: la mesa es para todas sus comisiones. */
  idMateria: number;
  /** Quien la preside (`idPresidente` en el DTO). El de la tabla `Docentes`, no el de `Usuarios`. */
  idDocente: number;
  /** El vocal 1, también de la tabla `Docentes`. */
  idVocal1: number;
  /** El vocal 2, también de la tabla `Docentes`. */
  idVocal2: number;
}
