/**
 * Un documento dentro de un legajo.
 *
 * ⚠️ Mock. El backend no tiene una entidad `Documento`: cada fila de
 * `legajo` es un documento (ver docs/contrato-api.md → "La base de datos
 * vs. el documento del MVP"). Este modelo es una apuesta razonable sobre la
 * forma que va a tener la respuesta real, no un contrato confirmado.
 */
export interface DocumentoLegajo {
  id: number;
  nombre: string;

  /**
   * `string | null`, no `EstadoDocumento | null`: la base guarda `estado`
   * como `varchar(50) NULL` (docs/contrato-api.md), texto libre y anulable.
   * `app-insignia-estado` ya maneja el caso de un valor inesperado.
   */
  estado: string | null;

  fechaSubida: Date;

  /**
   * A quién pertenece el documento. Solo se completa en los listados que
   * cruzan varias personas (el del Secretario); en "mi legajo" (Docente,
   * Alumno) no hace falta, porque ya se sabe de quién es.
   */
  propietario?: string;
}
