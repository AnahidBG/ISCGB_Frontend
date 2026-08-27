import { Observable } from 'rxjs';
import {
  JustificativoPendiente,
  NuevoJustificativo,
} from './modelos/justificativo-pendiente';

/** Los dos únicos veredictos posibles. Ver CLAUDE.md, regla de negocio #3. */
export type VeredictoAuditoria = 'Aprobado' | 'Rechazado';

export const MENSAJE_ERROR_JUSTIFICATIVOS =
  'No pudimos traer los justificativos. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_AUDITORIA =
  'No pudimos guardar la revisión. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_CARGA =
  'No pudimos cargar el justificativo. Revisá que el archivo sea un PDF.';

/**
 * Justificativos de inasistencia.
 *
 * Mismo patrón que `AuthService` y `LegajoService`: una clase abstracta con
 * una implementación HTTP real. A diferencia de aquellos, acá NO hay versión
 * mock — los tres endpoints existen y funcionan en el backend, así que no
 * hace falta simular nada.
 */
export abstract class JustificativosService {
  /** Los que esperan revisión de Secretaría. */
  abstract listarPendientes(): Observable<JustificativoPendiente[]>;

  /**
   * Aprobar o rechazar uno.
   *
   * ⚠️ La regla de negocio #4 de CLAUDE.md pide que rechazar dispare un email
   * automático al docente. El backend TODAVÍA NO LO HACE: `AuditarJustificativo`
   * solo actualiza el estado y el auditor, no hay `IEmailService` en el
   * proyecto (ver docs/verificacion-backend.md → punto 5). Por eso la pantalla
   * que use esto tiene que avisarle a quien revisa que el aviso hay que
   * mandarlo a mano por ahora — callarlo sería peor que no tener el botón.
   */
  abstract auditar(
    idJustificativo: number,
    veredicto: VeredictoAuditoria,
    idUsuarioAuditor: number,
  ): Observable<void>;

  /** Cargar un justificativo nuevo. */
  abstract cargar(justificativo: NuevoJustificativo): Observable<void>;
}
