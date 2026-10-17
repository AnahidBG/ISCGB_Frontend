import { Observable } from 'rxjs';
import {
  AlumnoDisponible,
  AsignacionMateria,
  ComisionDisponible,
  DocenteDisponible,
  InscripcionAlumno,
  NuevaMateria,
} from './modelos/asignacion-materia';
import { MateriaDelAlumno } from './modelos/materia-del-alumno';
import { MateriaDisponible } from './modelos/materia-disponible';

export const MENSAJE_ERROR_MATERIAS =
  'No pudimos traer las materias del instituto. Recargá la página para reintentar.';

/** Para `listarMisMaterias`: el de arriba habla de las materias del instituto. */
export const MENSAJE_ERROR_MIS_MATERIAS =
  'No pudimos traer tus materias. Recargá la página para reintentar.';

export const MENSAJE_ERROR_DATOS_ASIGNACION =
  'No pudimos traer las materias, los docentes o las comisiones. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_GUARDAR_MATERIAS =
  'No pudimos guardar los cambios. Intentá de nuevo en un momento.';

/**
 * Materias del instituto (`MateriasController`, ruta `api/Materias`):
 * la lista de materias, el alta de una materia nueva, la asignación
 * docente–materia–comisión y la inscripción alumno–materia–comisión.
 *
 * "Materias y asignaciones" (Dirección y Secretaría) usa la lista completa;
 * "Reconocimiento de saberes" (el alumno elige la materia) usa solo las del
 * alumno.
 */
export abstract class MateriasService {
  /** Todas las materias, ordenadas por nombre. */
  abstract listarDisponibles(): Observable<MateriaDisponible[]>;

  /**
   * Las materias en las que el alumno autenticado está inscripto, con su
   * carrera y curso. Puede venir vacía. Falla con el mensaje del servidor si
   * responde un 4xx con texto (por ejemplo, que el usuario no tiene perfil de
   * alumno) y con `MENSAJE_ERROR_MIS_MATERIAS` en cualquier otro caso.
   */
  abstract listarMisMaterias(): Observable<MateriaDelAlumno[]>;

  /** Todos los docentes del instituto, ordenados por nombre. */
  abstract listarDocentes(): Observable<DocenteDisponible[]>;

  /** Todas las comisiones, ordenadas por nombre. */
  abstract listarComisiones(): Observable<ComisionDisponible[]>;

  /**
   * Da de alta una materia. Devuelve el mensaje de confirmación. Falla con el
   * mensaje del backend si el nombre ya existe.
   */
  abstract crearMateria(materia: NuevaMateria): Observable<string>;

  /**
   * Asigna una materia a un docente en una comisión. Devuelve el mensaje de
   * confirmación. Falla con el mensaje del backend si ya estaba asignada.
   */
  abstract asignar(asignacion: AsignacionMateria): Observable<string>;

  /**
   * Todos los alumnos del instituto, ordenados por apellido (SCRUM-248).
   *
   * Falla con `MENSAJE_ERROR_DATOS_ASIGNACION`.
   */
  abstract listarAlumnos(): Observable<AlumnoDisponible[]>;

  /**
   * Inscribe a un alumno en una materia y comisión (SCRUM-248). Devuelve el
   * mensaje de confirmación. Falla con el mensaje del backend si el alumno, la
   * materia o la comisión no existen o si ya estaba inscripto.
   */
  abstract inscribirAlumno(inscripcion: InscripcionAlumno): Observable<string>;
}
