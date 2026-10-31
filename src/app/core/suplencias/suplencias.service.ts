import { Observable } from 'rxjs';
import { NuevaSuplencia, ResultadoSuplencia } from './modelos/suplencia';

export const MENSAJE_ERROR_SUPLENCIA =
  'No pudimos guardar la suplencia. Intentá de nuevo en un momento.';

/**
 * Las suplencias docentes: Dirección o Secretaría marcan a un docente como
 * suplente, con fecha de inicio y de fin, y le dan de baja la suplencia cuando
 * vuelve el titular.
 *
 * Mismo patrón que el resto de `core/`: una clase abstracta con una
 * implementación HTTP y una simulada, intercambiables desde `app.config.ts`.
 *
 * Endpoint del backend: `PUT /api/Docente/docentes/{idDocente}/suplencia`
 * (Director, Secretario), para las dos operaciones. No hay uno que diga quién es
 * suplente: la pantalla no puede mostrar las suplencias vigentes.
 */
export abstract class SuplenciasService {
  /**
   * Marca al docente como suplente. El backend, además, reactiva la cuenta si
   * estaba inactiva y le agrega el rol Docente si no lo tenía.
   *
   * Falla con el mensaje del backend cuando rechaza el pedido (el docente no
   * existe), o con `MENSAJE_ERROR_SUPLENCIA`.
   */
  abstract asignar(suplencia: NuevaSuplencia): Observable<ResultadoSuplencia>;

  /**
   * Le da de baja la suplencia y le quita el acceso: si la persona solo es
   * Docente, la cuenta queda inactiva; si tiene más roles, pierde el de Docente.
   * La fecha de fin, si no tenía, queda en hoy.
   *
   * Falla igual que `asignar`.
   */
  abstract darDeBaja(idDocente: number): Observable<ResultadoSuplencia>;
}
