/**
 * Un justificativo que cargó la propia persona, con su estado.
 *
 * Sale de `GET /api/Justificativos/{idUsuario}/justificativos`
 * (`JustificativoResponseDto`). A diferencia de `JustificativoPendiente`, trae
 * el estado: es lo que la persona necesita saber ("¿me lo aprobaron?").
 */
export interface JustificativoPropio {
  idJustificativo: number;
  tipoInasistencia: string;

  /** Ruta del PDF. `null` si no adjuntó (solo se puede con "Causas Personales"). Abrir con `urlArchivoSubido()`. */
  rutaArchivo: string | null;

  notaAdicional: string | null;
  fechaCarga: Date;

  /** Texto libre y anulable en la base: `app-insignia-estado` ya lo contempla. */
  estado: string | null;

  /** Primer y último día de la inasistencia. Cualquiera puede faltar. */
  fechaInicio: Date | null;
  fechaFin: Date | null;

  /** Si Secretaría o Dirección ya lo revisó (`idUsuarioAuditor` no es null). */
  revisado: boolean;
}
