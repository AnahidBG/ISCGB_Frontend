import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { MateriasService } from './materias.service';
import {
  AsignacionMateria,
  ComisionDisponible,
  DocenteDisponible,
  NuevaMateria,
} from './modelos/asignacion-materia';
import { MateriaDisponible } from './modelos/materia-disponible';

const DEMORA_SIMULADA_MS = 300;

/** Datos inventados para maquetar sin backend. Los ids no son los de la base. */
const MATERIAS_DE_EJEMPLO: readonly MateriaDisponible[] = [
  { idMateria: 1, nombre: 'Didáctica General' },
  { idMateria: 2, nombre: 'Pedagogía' },
  { idMateria: 3, nombre: 'Programación I' },
];

const DOCENTES_DE_EJEMPLO: readonly DocenteDisponible[] = [
  { idDocente: 1, nombreCompleto: 'Dolores Docente' },
  { idDocente: 2, nombreCompleto: 'Martín Morales' },
];

const COMISIONES_DE_EJEMPLO: readonly ComisionDisponible[] = [
  { idComision: 1, nombre: 'Comisión A' },
  { idComision: 2, nombre: 'Comisión B' },
];

/**
 * Imita las dos reglas de `MateriasController` que la pantalla tiene que
 * saber mostrar: nombre de materia repetido y asignación repetida. Todo queda
 * en memoria y se pierde al recargar.
 */
@Injectable()
export class MateriasMockService extends MateriasService {
  private readonly materias: MateriaDisponible[] = [...MATERIAS_DE_EJEMPLO];
  private readonly asignaciones: AsignacionMateria[] = [];

  listarDisponibles(): Observable<MateriaDisponible[]> {
    const ordenadas = [...this.materias].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return of(ordenadas).pipe(delay(DEMORA_SIMULADA_MS));
  }

  listarMisMaterias(): Observable<MateriaDisponible[]> {
    return this.listarDisponibles();
  }

  listarDocentes(): Observable<DocenteDisponible[]> {
    return of([...DOCENTES_DE_EJEMPLO]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  listarComisiones(): Observable<ComisionDisponible[]> {
    return of([...COMISIONES_DE_EJEMPLO]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  crearMateria(materia: NuevaMateria): Observable<string> {
    const repetida = this.materias.some(
      (existente) => existente.nombre.toLowerCase() === materia.nombre.toLowerCase(),
    );
    if (repetida) {
      return this.fallar('Ya existe una materia con ese nombre en el sistema.');
    }
    this.materias.push({ idMateria: Date.now(), nombre: materia.nombre });
    return of('Materia creada correctamente.').pipe(delay(DEMORA_SIMULADA_MS));
  }

  asignar(asignacion: AsignacionMateria): Observable<string> {
    const repetida = this.asignaciones.some(
      (a) =>
        a.idDocente === asignacion.idDocente &&
        a.idMateria === asignacion.idMateria &&
        a.idComision === asignacion.idComision,
    );
    if (repetida) {
      return this.fallar('El docente ya tiene asignada esta materia en esta comisión.');
    }
    this.asignaciones.push({ ...asignacion });
    return of('Materia asignada correctamente al docente en la comisión indicada.').pipe(
      delay(DEMORA_SIMULADA_MS),
    );
  }

  private fallar(mensaje: string): Observable<never> {
    return throwError(() => new Error(mensaje)).pipe(delay(DEMORA_SIMULADA_MS));
  }
}
