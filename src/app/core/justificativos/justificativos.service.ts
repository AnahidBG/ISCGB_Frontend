import { Observable } from 'rxjs';
import { OpcionesPedido } from '../comun/opciones-pedido';
import {
  JustificativoPendiente,
  NuevoJustificativo,
} from './modelos/justificativo-pendiente';
import { JustificativoPropio } from './modelos/justificativo-propio';

/** Los dos únicos veredictos posibles. Ver CLAUDE.md, regla de negocio #3. */
export type VeredictoAuditoria = 'Aprobado' | 'Rechazado';

/**
 * Lo que se decide al revisar un justificativo. Rechazar lleva SIEMPRE un
 * motivo: es lo que le llega por correo a la persona, y sin él no sabe qué
 * corregir. Aprobar no lo lleva.
 */
export type AuditoriaJustificativo =
  | { veredicto: 'Aprobado' }
  | { veredicto: 'Rechazado'; motivo: string };

export const MENSAJE_ERROR_JUSTIFICATIVOS =
  'No pudimos traer los justificativos. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_AUDITORIA =
  'No pudimos guardar la revisión. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_CARGA =
  'No pudimos cargar el justificativo. Revisá que el archivo sea un PDF.';

/** Por si el backend contesta 200 sin `message`. Dice lo mismo que el suyo. */
export const MENSAJE_CARGA_POR_DEFECTO =
  'Acordate de llevar el certificado en papel el día que te reincorpores.';

export const MENSAJE_ERROR_MIS_JUSTIFICATIVOS =
  'No pudimos traer tus justificativos. Intentá de nuevo en un momento.';

/**
 * Justificativos de inasistencia.
 *
 * Mismo patrón que `AuthService` y `LegajoService`: una clase abstracta con
 * una implementación HTTP real. A diferencia de aquellos, acá NO hay versión
 * mock — los tres endpoints existen y funcionan en el backend, así que no
 * hace falta simular nada.
 */
export abstract class JustificativosService {
  /**
   * Los que esperan revisión de Secretaría o Dirección.
   * `opciones.enSegundoPlano`: pedido accesorio, que no bloquee la pantalla.
   */
  abstract listarPendientes(opciones?: OpcionesPedido): Observable<JustificativoPendiente[]>;

  /**
   * Aprobar o rechazar uno. Director y Secretario; el auditor sale del token.
   *
   * Desde el 10/11/2026, al rechazar el backend le manda un correo a la persona
   * con el motivo (regla de negocio #4). El motivo NO se guarda en la base: solo
   * viaja en ese correo.
   */
  abstract auditar(idJustificativo: number, auditoria: AuditoriaJustificativo): Observable<void>;

  /**
   * Cargar un justificativo nuevo. Devuelve el `message` del backend porque
   * ahí viene la instrucción de llevar el certificado en papel.
   */
  abstract cargar(justificativo: NuevoJustificativo): Observable<string>;

  /** Los justificativos de una persona con su estado, del más nuevo al más viejo. */
  abstract listarDeUsuario(idUsuario: number): Observable<JustificativoPropio[]>;
}
