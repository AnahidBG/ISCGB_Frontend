/**
 * Un documento dentro de un legajo. Cada fila de la tabla `legajo` es uno.
 */
export interface DocumentoLegajo {
  id: number;
  nombre: string;

  /** Texto libre y anulable en la base. `app-insignia-estado` ya lo contempla. */
  estado: string | null;

  fechaSubida: Date;

  /**
   * Por qué lo rechazaron, o la aclaración de quien auditó. Es el campo
   * `comentario` de la tabla, que el backend ya devolvía y antes tirábamos.
   */
  comentario: string | null;

  /** Solo la tienen los documentos anuales. */
  fechaVencimiento: Date | null;

  /**
   * A quién pertenece. Solo se completa en los listados que cruzan varias
   * personas; en "mi legajo" ya se sabe de quién es.
   */
  propietario?: string;

  /**
   * El PDF, para poder abrirlo antes de aprobar o rechazar. Lo mandan tanto
   * `usuario/{id}` como `/pendientes`. Opcional porque los datos de prueba
   * no lo tienen cargado.
   */
  rutaArchivo?: string | null;

  /**
   * Si Secretaría tiene además el papel físico de este documento. El backend
   * ya lo devuelve; antes se descartaba al mapear la respuesta.
   */
  presentadoFisico: boolean;

  /**
   * Nombre de quien lo aprobó o rechazó, o `null` si nadie lo revisó todavía.
   * Lo manda `GET /api/Legajos/usuario/{id}` (`LegajoDetalleDto.Auditor`) y
   * antes se descartaba. Opcional porque `/pendientes` no lo trae.
   */
  auditor?: string | null;
}
