import { Observable } from 'rxjs';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { EstadoMes } from './modelos/estado-mes';

export const MENSAJE_ERROR_CALENDARIO =
  'No pudimos traer el calendario de exámenes. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_LIMITE_DIARIO =
  'No pudimos traer el límite de exámenes por día. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO =
  'No pudimos guardar el límite. Intentá de nuevo en un momento.';

/**
 * El calendario de exámenes (SCRUM-183, consulta del estado de cada día) y el
 * límite de exámenes por día, que fija Secretaría.
 *
 * Mismo patrón que el resto de `core/`: una clase abstracta con una
 * implementación HTTP y una simulada, intercambiables desde `app.config.ts`.
 *
 * Endpoints del backend (`ConfiguracionCalendarioController`):
 *
 *   · `GET /api/ConfiguracionCalendario/estado-mes?anio=&mes=` → `estadoDelMes` y `limiteDiario`
 *   · `PUT /api/ConfiguracionCalendario/limite-parciales` → `guardarLimiteDiario`
 *
 * Registrar, modificar y eliminar exámenes existen en el backend y todavía no
 * se consumen. Tampoco hay un endpoint que liste los exámenes: por eso el
 * calendario dice cuántos hay cada día y no cuáles.
 */
export abstract class ExamenesService {
  /**
   * Cómo está un mes: el límite de exámenes por día y los días que ya tienen
   * alguno. `mes` va de 1 a 12.
   *
   * `opciones.enSegundoPlano`: la pantalla ya muestra su propia espera, que no
   * tape todo con el velo global.
   *
   * Falla con `MENSAJE_ERROR_CALENDARIO`.
   */
  abstract estadoDelMes(
    anio: number,
    mes: number,
    opciones?: OpcionesPedido,
  ): Observable<EstadoMes>;

  /**
   * Cuántos exámenes admite un día. Es uno solo, para todo el instituto y para
   * todos los tipos de examen. Si nunca se configuró, el backend devuelve su
   * valor por defecto (2).
   *
   * Falla con `MENSAJE_ERROR_LIMITE_DIARIO`.
   */
  abstract limiteDiario(): Observable<number>;

  /**
   * Fija el límite de exámenes por día. Tiene que ser un entero mayor a 0.
   *
   * Falla con el mensaje del backend cuando rechaza el valor, o con
   * `MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO`.
   */
  abstract guardarLimiteDiario(limite: number): Observable<void>;
}
