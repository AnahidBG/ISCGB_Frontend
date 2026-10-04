import { Observable } from 'rxjs';
import { ResultadoBusqueda } from './modelos/resultado-busqueda';

/** Con menos letras el backend responde vacío: ni se pregunta. */
export const LARGO_MINIMO_BUSQUEDA = 2;

export const MENSAJE_ERROR_BUSQUEDA =
  'No pudimos hacer la búsqueda. Intentá de nuevo en un momento.';

/**
 * Buscador del encabezado: personas, materias y justificativos que contienen
 * un texto (`GET /api/Buscador/global`). Lo usan Director y Secretario — ver
 * `permiso-busqueda.ts`.
 */
export abstract class BusquedaService {
  /**
   * Los resultados para un término. Con menos de `LARGO_MINIMO_BUSQUEDA`
   * letras (sin contar espacios) devuelve `[]` sin preguntarle al backend.
   */
  abstract buscar(termino: string): Observable<ResultadoBusqueda[]>;
}
