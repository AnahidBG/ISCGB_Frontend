import { Observable } from 'rxjs';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { EstadoMes } from './modelos/estado-mes';
import { MesaAsignada } from './modelos/mesa-asignada';

export const MENSAJE_ERROR_CALENDARIO =
  'No pudimos traer el calendario de exámenes. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_LIMITE_DIARIO =
  'No pudimos traer el límite de exámenes por día. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO =
  'No pudimos guardar el límite. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_MESAS_ASIGNADAS =
  'No pudimos traer tus mesas de examen. Intentá de nuevo en un momento.';

/**
 * El calendario de exámenes (SCRUM-183, consulta del estado de cada día), el
 * límite de exámenes por día, que fija Secretaría, y las mesas de examen que le
 * asignaron al docente.
 *
 * Mismo patrón que el resto de `core/`: una clase abstracta con una
 * implementación HTTP y una simulada, intercambiables desde `app.config.ts`.
 *
 * Endpoints del backend:
 *
 *   · `GET /api/ConfiguracionCalendario/estado-mes?anio=&mes=` → `estadoDelMes` y `limiteDiario`
 *   · `PUT /api/ConfiguracionCalendario/limite-parciales` → `guardarLimiteDiario`
 *   · `GET /api/Configuracion/mis-notificaciones` → `mesasAsignadas`
 *
 * Registrar, modificar y eliminar exámenes existen en el backend y todavía no
 * se consumen. Tampoco hay un endpoint que liste los exámenes: por eso el
 * calendario dice cuántos hay cada día y no cuáles. Y no hay forma de aceptar
 * ni rechazar una mesa ni de darla de alta.
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

  /**
   * Las mesas de examen a las que asignaron al docente de la sesión y que
   * todavía no respondió. Solo sirve con el rol Docente.
   *
   * Trae TODAS, también las de exámenes que ya pasaron: filtrarlas es cosa de
   * quien las muestra. Un usuario sin perfil de docente no tiene mesas y recibe
   * una lista vacía.
   *
   * `opciones.enSegundoPlano`: lo pide la campana en todas las pantallas, que no
   * tape nada con el velo global.
   *
   * Falla con `MENSAJE_ERROR_MESAS_ASIGNADAS`.
   */
  abstract mesasAsignadas(opciones?: OpcionesPedido): Observable<MesaAsignada[]>;
}
