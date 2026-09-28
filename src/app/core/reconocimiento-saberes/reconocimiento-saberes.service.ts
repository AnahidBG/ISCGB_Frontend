import { Observable } from 'rxjs';

/**
 * Una solicitud de reconocimiento de saberes — Sprint 2, "Solicitar
 * Reconocimiento de Saberes" (SCRUM-30).
 *
 * Criterios de aceptación:
 *   · El programa de la materia de la otra institución y el analítico /
 *     rendimiento académico se adjuntan en PDF.
 *   · En la sección de la materia del ISCGB se puede escribir un comentario.
 */
export interface SolicitudReconocimiento {
  idUsuario: number;

  /** La materia del ISCGB que se pide reconocer, tal como la escribe el alumno. */
  materiaIscgb: string;

  /** Aclaración libre: en qué institución la cursó, año, equivalencias, etc. */
  comentario: string | null;

  /** Programa de la materia aprobada en la otra institución. Solo PDF. */
  programaOtraInstitucion: File;

  /** Analítico o constancia de rendimiento académico. Solo PDF. */
  analitico: File;
}

export const MENSAJE_ERROR_RECONOCIMIENTO =
  'No pudimos enviar la solicitud. Revisá que los archivos sean PDF e intentá de nuevo.';

/**
 * El backend todavía no tiene el endpoint. La tabla `reconocimiento_saberes`
 * existe en la base, pero no hay controlador (SCRUM-173, backend, "Por
 * hacer"). Se distingue del error genérico: reintentar no lo arregla.
 */
export const MENSAJE_RECONOCIMIENTO_NO_DISPONIBLE =
  'El sistema todavía no recibe solicitudes de reconocimiento de saberes: falta habilitarlo del ' +
  'lado del servidor. Mientras tanto, presentá esta documentación en Secretaría.';

export const MENSAJE_RECONOCIMIENTO_ENVIADO =
  'Tu solicitud llegó a Secretaría. Te van a contactar para seguir el trámite.';

/**
 * Envío de la solicitud de reconocimiento de saberes a Secretaría.
 *
 * Mismo patrón que `JustificativosService`: una clase abstracta y una
 * implementación HTTP. Fuera de alcance del MVP (ISCGB-PROJECT.md): lo que
 * pasa DESPUÉS del envío entre Secretaría, Dirección y el alumno queda fuera
 * del sistema — por eso acá no hay listado ni estados de la solicitud.
 */
export abstract class ReconocimientoSaberesService {
  /** Devuelve el mensaje de confirmación. */
  abstract enviar(solicitud: SolicitudReconocimiento): Observable<string>;
}
