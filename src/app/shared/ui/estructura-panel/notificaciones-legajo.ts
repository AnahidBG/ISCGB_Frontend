import { DocumentoLegajo } from '../../../core/legajos/modelos/documento-legajo';
import { NotificacionPanel } from './estructura-panel';

/** Cuántas novedades entran en el panelcito antes de resumir el resto. */
export const MAXIMO_NOTIFICACIONES = 5;

/**
 * Los documentos rechazados de un legajo, como novedades de la campana.
 *
 * Es el caso más repetido del sistema — lo usan el panel del Docente, el del
 * Alumno y "Mis Documentos" — y por eso vive acá y no copiado en cada uno:
 * si mañana cambia cómo se redacta el aviso, cambia en un solo lugar (mismo
 * criterio que `enlacesPorSesion` con el menú).
 *
 * Solo cuenta lo RECHAZADO, no lo pendiente: un rechazo es algo que esta
 * persona tiene que resolver (volver a subir el documento), mientras que un
 * pendiente está esperando a Secretaría. Avisarle de algo sobre lo que no
 * puede hacer nada la entrena para ignorar la campana.
 */
export function notificacionesPorRechazos(
  documentos: readonly DocumentoLegajo[],
  opciones: { url?: string; maximo?: number } = {},
): NotificacionPanel[] {
  const maximo = opciones.maximo ?? MAXIMO_NOTIFICACIONES;

  return documentos
    .filter((documento) => documento.estado === 'Rechazado')
    // Lo más nuevo primero: es lo que la persona todavía no vio.
    .sort((a, b) => b.fechaSubida.getTime() - a.fechaSubida.getTime())
    .slice(0, maximo)
    .map((documento) => ({
      titulo: `Rechazaron ${documento.nombre}`,
      // El motivo es lo único que dice qué hay que corregir. Cuando quien
      // auditó no escribió ninguno, se dice eso en vez de dejar la fila muda.
      detalle: documento.comentario ?? 'Sin motivo cargado: consultá en Secretaría.',
      url: opciones.url,
      tono: 'rechazado' as const,
    }));
}
