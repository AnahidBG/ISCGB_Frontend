import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { esEndpointInexistente, mensajeDelServidor } from '../comun/error-api';
import { RUTAS_API } from '../configuracion/api';
import {
  MENSAJE_ERROR_DATOS_ASIGNACION,
  MENSAJE_ERROR_GUARDAR_MATERIAS,
  MENSAJE_ERROR_MATERIAS,
  MateriasService,
} from './materias.service';
import {
  AsignacionMateria,
  ComisionDisponible,
  DocenteDisponible,
  NuevaMateria,
} from './modelos/asignacion-materia';
import { MateriaDisponible } from './modelos/materia-disponible';

/** Los tres GET de `MateriasController` envuelven la lista en `{ data }`. */
interface ListaApi<T> {
  data?: T[];
}

interface MateriaApi {
  idMateria: number;
  nombreMateria: string | null;
}

interface DocenteApi {
  idDocente: number;
  nombreCompleto: string | null;
}

interface ComisionApi {
  idComision: number;
  nombreComision: string | null;
}

/** Lo que devuelven el alta de materia y la asignación en un 200. */
interface RespuestaGuardadoApi {
  message?: string;
}

/** Cuando el backend todavía no publicó `MateriasController`. */
const MENSAJE_ASIGNACIONES_NO_DISPONIBLE =
  'El servidor todavía no tiene habilitada la gestión de materias.';

@Injectable()
export class MateriasHttpService extends MateriasService {
  private readonly http = inject(HttpClient);

  listarDisponibles(): Observable<MateriaDisponible[]> {
    return this.http.get<ListaApi<MateriaApi>>(RUTAS_API.materiasDisponibles).pipe(
      map((respuesta) =>
        (respuesta?.data ?? []).map((materia) => ({
          idMateria: materia.idMateria,
          nombre: materia.nombreMateria?.trim() || 'Materia sin nombre',
        })),
      ),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer las materias:', error);
        return throwError(() => new Error(MENSAJE_ERROR_MATERIAS));
      }),
    );
  }

  listarMisMaterias(): Observable<MateriaDisponible[]> {
    return this.http.get<MateriaDisponible[]>(RUTAS_API.misMaterias).pipe(
      map((materias) => materias ?? []),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer las materias del alumno:', error);
        return throwError(() => new Error(MENSAJE_ERROR_MATERIAS));
      }),
    );
  }

  listarDocentes(): Observable<DocenteDisponible[]> {
    return this.http.get<ListaApi<DocenteApi>>(RUTAS_API.docentesDisponibles).pipe(
      map((respuesta) =>
        (respuesta?.data ?? []).map((docente) => ({
          idDocente: docente.idDocente,
          // El backend concatena nombre y apellido anulables: puede llegar " ".
          nombreCompleto: docente.nombreCompleto?.trim() || 'Docente sin nombre cargado',
        })),
      ),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer los docentes:', error);
        return throwError(() => new Error(MENSAJE_ERROR_DATOS_ASIGNACION));
      }),
    );
  }

  listarComisiones(): Observable<ComisionDisponible[]> {
    return this.http.get<ListaApi<ComisionApi>>(RUTAS_API.comisionesDisponibles).pipe(
      map((respuesta) =>
        (respuesta?.data ?? []).map((comision) => ({
          idComision: comision.idComision,
          nombre: comision.nombreComision?.trim() || 'Comisión sin nombre',
        })),
      ),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer las comisiones:', error);
        return throwError(() => new Error(MENSAJE_ERROR_DATOS_ASIGNACION));
      }),
    );
  }

  crearMateria(materia: NuevaMateria): Observable<string> {
    // `CargarMateriaDto` llama `NombreMateria` a lo que acá es `nombre`.
    const cuerpo = { nombreMateria: materia.nombre, carrera: materia.carrera, curso: materia.curso };
    return this.http.post<RespuestaGuardadoApi>(RUTAS_API.cargarMateria, cuerpo).pipe(
      map((respuesta) => respuesta?.message?.trim() || 'Materia creada correctamente.'),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(traducirError(error)))),
    );
  }

  asignar(asignacion: AsignacionMateria): Observable<string> {
    return this.http.post<RespuestaGuardadoApi>(RUTAS_API.asignarMateria, asignacion).pipe(
      map((respuesta) => respuesta?.message?.trim() || 'Materia asignada correctamente.'),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(traducirError(error)))),
    );
  }
}

/**
 * El 400 del backend es justo lo que la persona necesita leer ("Ya existe
 * una materia con ese nombre", "El docente ya tiene asignada esta materia en
 * esta comisión"), así que se muestra tal cual.
 */
function traducirError(error: HttpErrorResponse): string {
  if (esEndpointInexistente(error)) {
    return MENSAJE_ASIGNACIONES_NO_DISPONIBLE;
  }
  const delServidor = error.status === 400 ? mensajeDelServidor(error) : null;
  if (delServidor !== null) {
    return delServidor;
  }
  console.error('Error al guardar en materias:', error);
  return MENSAJE_ERROR_GUARDAR_MATERIAS;
}
