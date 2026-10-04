/** Los dos PDF de una solicitud, con el nombre que usa la ruta del backend. */
export type AdjuntoReconocimiento = 'programa' | 'analitico';

/**
 * Una solicitud de reconocimiento de saberes esperando a Secretaría.
 *
 * Sale de `GET /api/ReconocimientoSaberes/recibirSolicitudReconocimiento`.
 * Las URL de los PDF que manda el backend no se guardan: se arman con
 * `RUTAS_API.adjuntoReconocimiento`, que es el único lugar con URLs.
 */
export interface SolicitudPendiente {
  idSolicitud: number;

  /** "Apellido, Nombre", tal como lo arma el backend. */
  alumno: string;

  /** Solo dígitos. Vacío si la persona no tiene DNI cargado. */
  dni: string;

  /** Nombre de la materia del ISCGB que pide reconocer. */
  materia: string;

  /** Lo que escribió el alumno, o `null` si no escribió nada. */
  comentario: string | null;
}
