import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { MateriasService } from './materias.service';
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

const DEMORA_SIMULADA_MS = 300;

/** Datos inventados para maquetar sin backend. Los ids no son los de la base. */
const MATERIAS_DE_EJEMPLO: readonly MateriaDisponible[] = [
  { idMateria: 1, nombre: 'Didáctica General' },
  { idMateria: 2, nombre: 'Pedagogía' },
  { idMateria: 3, nombre: 'Programación I' },
];

/**
 * Las materias en las que está inscripto el alumno de ejemplo: solo una parte
 * de las del instituto, y con la carrera y el curso que trae `mis-materias`.
 * `carrera` y `curso` pueden venir en `null`, como en la base.
 */
const MATERIAS_DEL_ALUMNO_DE_EJEMPLO: readonly MateriaDelAlumno[] = [
  {
    idMateria: 3,
    nombre: 'Programación I',
    carrera: 'Tecnicatura en Desarrollo de Software',
    curso: 'Primer Año',
  },
  {
    idMateria: 2,
    nombre: 'Pedagogía',
    carrera: 'Tecnicatura en Desarrollo de Software',
    curso: null,
  },
  { idMateria: 1, nombre: 'Didáctica General', carrera: null, curso: null },
];

const DOCENTES_DE_EJEMPLO: readonly DocenteDisponible[] = [
  { idDocente: 1, nombreCompleto: 'Dolores Docente' },
  { idDocente: 2, nombreCompleto: 'Martín Morales' },
];

const COMISIONES_DE_EJEMPLO: readonly ComisionDisponible[] = [
  { idComision: 1, nombre: 'Comisión A' },
  { idComision: 2, nombre: 'Comisión B' },
];

const ALUMNOS_DE_EJEMPLO: readonly AlumnoDisponible[] = [
  { idAlumno: 1, nombreCompleto: 'Gómez, Juan (Legajo: 1203)' },
  { idAlumno: 2, nombreCompleto: 'Ruiz, Laura (Legajo: 1250)' },
];

/**
 * Imita las reglas de `MateriasController` que la pantalla tiene que saber
 * mostrar: nombre de materia repetido, asignación repetida e inscripción
 * repetida. Todo queda en memoria y se pierde al recargar.
 */
@Injectable()
export class MateriasMockService extends MateriasService {
  private readonly materias: MateriaDisponible[] = [...MATERIAS_DE_EJEMPLO];
  private readonly asignaciones: AsignacionMateria[] = [];
  private readonly inscripciones: InscripcionAlumno[] = [];

  listarDisponibles(): Observable<MateriaDisponible[]> {
    const ordenadas = [...this.materias].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return of(ordenadas).pipe(delay(DEMORA_SIMULADA_MS));
  }

  listarMisMaterias(): Observable<MateriaDelAlumno[]> {
    return of([...MATERIAS_DEL_ALUMNO_DE_EJEMPLO]).pipe(delay(DEMORA_SIMULADA_MS));
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

  listarAlumnos(): Observable<AlumnoDisponible[]> {
    return of([...ALUMNOS_DE_EJEMPLO]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  inscribirAlumno(inscripcion: InscripcionAlumno): Observable<string> {
    const repetida = this.inscripciones.some(
      (i) =>
        i.idAlumno === inscripcion.idAlumno &&
        i.idMateria === inscripcion.idMateria &&
        i.idComision === inscripcion.idComision,
    );
    if (repetida) {
      return this.fallar('El alumno ya se encuentra inscripto en esa materia y comisión.');
    }
    this.inscripciones.push({ ...inscripcion });
    return of('Materia y comisión asignadas al alumno correctamente.').pipe(
      delay(DEMORA_SIMULADA_MS),
    );
  }

  private fallar(mensaje: string): Observable<never> {
    return throwError(() => new Error(mensaje)).pipe(delay(DEMORA_SIMULADA_MS));
  }
}
