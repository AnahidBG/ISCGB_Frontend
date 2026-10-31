/**
 * Un contrato firmado, sellado y digitalizado que Secretaría carga en el perfil
 * de un alumno, como el convenio de la beca (SCRUM-227). El alumno lo ve y lo
 * descarga desde su panel.
 */
export interface ContratoAlumno {
  idContrato: number;
  /** Qué contrato es: "Convenio Beca Fundación Encode 2026". */
  nombre: string;
  fechaCarga: Date;
}

/** Lo que manda Secretaría al cargar un contrato. */
export interface NuevoContrato {
  /** El de la tabla `Usuarios`: la persona con rol Alumno. */
  idUsuario: number;
  nombre: string;
  /** Siempre un PDF (regla de negocio #1). */
  archivo: File;
}
