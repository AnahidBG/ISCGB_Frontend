import { Observable } from 'rxjs';
import { AdjuntoReconocimiento, SolicitudPendiente } from './modelos/solicitud-pendiente';

/**
 * Una solicitud de reconocimiento de saberes — Sprint 2, "Solicitar
 * Reconocimiento de Saberes" (SCRUM-30).
 *
 * Sigue `SolicitudReconocimientoDto` del backend (PR #23):
 *   · La materia del ISCGB va por id: se elige de la lista de materias, no se
 *     escribe. Antes era texto libre y el backend no tenía dónde guardarlo.
 *   · El alumno NO viaja en el cuerpo: el backend lo saca del token.
 *   · El programa de la otra institución y el analítico van en PDF.
 *   · En la sección de la materia del ISCGB se puede escribir un comentario.
 */
export interface SolicitudReconocimiento {
  /** La materia del ISCGB que se pide reconocer (`materias.id_materia`). */
  idMateria: number;

  /** Aclaración libre: en qué institución la cursó, año, equivalencias, etc. */
  comentario: string | null;

  /** Programa de la materia aprobada en la otra institución. Solo PDF, hasta 10 MB. */
  programaPdf: File;

  /** Analítico o constancia de rendimiento académico. Solo PDF, hasta 10 MB. */
  analiticoPdf: File;
}

export const MENSAJE_ERROR_RECONOCIMIENTO =
  'No pudimos enviar la solicitud. Revisá que los archivos sean PDF e intentá de nuevo.';

/**
 * La ruta no existe en el servidor (un backend sin el PR #23). Se distingue
 * del error genérico: reintentar no lo arregla.
 */
export const MENSAJE_RECONOCIMIENTO_NO_DISPONIBLE =
  'El sistema todavía no recibe solicitudes de reconocimiento de saberes: falta habilitarlo del ' +
  'lado del servidor. Mientras tanto, presentá esta documentación en Secretaría.';

/** Por si el backend contesta 200 sin `mensaje`. */
export const MENSAJE_RECONOCIMIENTO_ENVIADO =
  'Tu solicitud llegó a Secretaría. Te van a contactar para seguir el trámite.';

export const MENSAJE_ERROR_SOLICITUDES =
  'No pudimos traer las solicitudes de reconocimiento. Intentá de nuevo en un momento.';

export const MENSAJE_ADJUNTO_NO_ENCONTRADO =
  'El archivo de esta solicitud no está en el servidor. Pedile al alumno que lo vuelva a enviar.';

export const MENSAJE_ERROR_ADJUNTO =
  'No pudimos descargar el archivo. Intentá de nuevo en un momento.';

/**
 * Reconocimiento de saberes: el alumno envía la solicitud y Secretaría la
 * recibe (SCRUM-30).
 *
 * Mismo patrón que `JustificativosService`: una clase abstracta y una
 * implementación HTTP. Lo que pasa DESPUÉS de que Secretaría la recibe queda
 * fuera del MVP (ISCGB-PROJECT.md): el backend no tiene cómo marcarla como
 * resuelta, así que la bandeja solo lista y deja bajar los PDF.
 */
export abstract class ReconocimientoSaberesService {
  /** El alumno envía la solicitud. Devuelve el mensaje de confirmación. */
  abstract enviar(solicitud: SolicitudReconocimiento): Observable<string>;

  /** Las solicitudes que esperan a Secretaría (solo rol Secretario). */
  abstract listarPendientes(): Observable<SolicitudPendiente[]>;

  /**
   * Uno de los dos PDF de una solicitud, como archivo en memoria.
   *
   * No alcanza con un enlace: el endpoint tiene `[Authorize]` y el token va
   * en un header, que un `<a href>` no manda.
   */
  abstract descargarAdjunto(idSolicitud: number, adjunto: AdjuntoReconocimiento): Observable<Blob>;
}
