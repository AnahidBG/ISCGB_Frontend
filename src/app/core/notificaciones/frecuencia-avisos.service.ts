import { Observable } from 'rxjs';

export const MENSAJE_ERROR_FRECUENCIA =
  'No pudimos traer la frecuencia de los avisos. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_GUARDAR_FRECUENCIA =
  'No pudimos guardar la frecuencia. Intentá de nuevo en un momento.';

/**
 * Cada cuántos días el sistema le recuerda por mail a cada persona la
 * documentación que le falta entregar (SCRUM-151, configuración de Secretaría).
 *
 * Mismo patrón que el resto de `core/`: una clase abstracta con una
 * implementación HTTP y una simulada, intercambiables desde `app.config.ts`.
 *
 * Endpoints del backend (`ConfiguracionController`):
 *
 *   · `GET /api/Configuracion/frecuencia-notificaciones` → `obtener`
 *   · `PUT /api/Configuracion/frecuencia-notificaciones` → `guardar`
 *
 * El envío no es inmediato: un proceso del servidor revisa una vez por día a
 * quién le toca el aviso. Cambiar la frecuencia rige desde la próxima revisión.
 */
export abstract class FrecuenciaAvisosService {
  /**
   * Los días entre un aviso y el siguiente. Si nunca se configuró, el backend
   * devuelve su valor por defecto (7).
   */
  abstract obtener(): Observable<number>;

  /**
   * Guarda la frecuencia. Tiene que ser un entero mayor a 0.
   *
   * Falla con el mensaje del backend cuando rechaza el valor, o con
   * `MENSAJE_ERROR_GUARDAR_FRECUENCIA`.
   */
  abstract guardar(dias: number): Observable<void>;
}
