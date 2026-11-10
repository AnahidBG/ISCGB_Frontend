/**
 * Una mesa de examen que arma Dirección o Secretaría, con su tribunal: el
 * docente que la preside y los dos vocales.
 *
 * Quien la preside va en `RegistrarMesaDto`; los vocales se convocan después,
 * con `asignar-docente`. El backend no guarda quién preside y quién es vocal:
 * los tres quedan convocados igual ("Pendiente") y cada uno acepta o rechaza
 * por su cuenta.
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
  /** Quien la preside. El de la tabla `Docentes`, no el de `Usuarios`. */
  idDocente: number;
  /** El vocal 1, también de la tabla `Docentes`. */
  idVocal1: number;
  /** El vocal 2, también de la tabla `Docentes`. */
  idVocal2: number;
}
