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
}
