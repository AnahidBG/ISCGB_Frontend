import { Observable } from 'rxjs';
import {
  AsignacionMateria,
  ComisionDisponible,
  DocenteDisponible,
  NuevaMateria,
} from './modelos/asignacion-materia';
import { MateriaDisponible } from './modelos/materia-disponible';

export const MENSAJE_ERROR_MATERIAS =
  'No pudimos traer las materias del instituto. Recargá la página para reintentar.';

export const MENSAJE_ERROR_DATOS_ASIGNACION =
  'No pudimos traer las materias, los docentes o las comisiones. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_GUARDAR_MATERIAS =
  'No pudimos guardar los cambios. Intentá de nuevo en un momento.';

/**
 * Materias del instituto (`AsignacionesController`, ruta `api/Asignaciones`):
 * la lista de materias, el alta de una materia nueva y la asignación
 * docente–materia–comisión.
 *
 * La lista de materias la usan "Reconocimiento de saberes" (el alumno elige
 * la materia) y "Materias y asignaciones" (Dirección y Secretaría).
 */
export abstract class MateriasService {
  /** Todas las materias, ordenadas por nombre. */
  abstract listarDisponibles(): Observable<MateriaDisponible[]>;

  /** Materias asignadas al alumno autenticado. */
  abstract listarMisMaterias(): Observable<MateriaDisponible[]>;

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
}
