import { Observable } from 'rxjs';
import { ContratoAlumno, NuevoContrato } from './modelos/contrato-alumno';

export const MENSAJE_ERROR_CARGAR_CONTRATO =
  'No pudimos cargar el contrato. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_LISTAR_CONTRATOS =
  'No pudimos traer los contratos. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_DESCARGAR_CONTRATO =
  'No pudimos descargar el contrato. Intentá de nuevo en un momento.';

/**
 * Los contratos de los alumnos (SCRUM-227): Secretaría carga en el perfil de un
 * alumno los contratos ya firmados, sellados y digitalizados, como el convenio
 * de la beca, y el alumno los ve y los descarga desde su panel.
 *
 * Mismo patrón que el resto de `core/`: una clase abstracta con una
 * implementación HTTP y una simulada, intercambiables desde `app.config.ts`.
 *
 * El backend todavía no tiene estos endpoints. `ContratosHttpService` sigue el
 * contrato que propuso el frontend (`api/ContratosAlumno`, ver
 * docs/contrato-api.md) y hasta que exista se usa `ContratosMockService`.
 */
export abstract class ContratosService {
  /**
   * Secretaría carga un contrato en el perfil de un alumno. Devuelve el mensaje
   * de confirmación.
   *
   * Falla con el mensaje del backend cuando rechaza el pedido (el archivo no es
   * un PDF, la persona no es alumno), o con `MENSAJE_ERROR_CARGAR_CONTRATO`.
   */
  abstract cargar(contrato: NuevoContrato): Observable<string>;

  /**
   * Los contratos de un alumno, del más nuevo al más viejo. Para Secretaría.
   * Falla con `MENSAJE_ERROR_LISTAR_CONTRATOS`.
   */
  abstract listarDeAlumno(idUsuario: number): Observable<ContratoAlumno[]>;

  /**
   * Los contratos del alumno de la sesión, del más nuevo al más viejo.
   * Falla con `MENSAJE_ERROR_LISTAR_CONTRATOS`.
   */
  abstract misContratos(): Observable<ContratoAlumno[]>;

  /** El PDF de un contrato. Falla con `MENSAJE_ERROR_DESCARGAR_CONTRATO`. */
  abstract descargar(idContrato: number): Observable<Blob>;
}
