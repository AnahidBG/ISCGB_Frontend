/**
 * Un justificativo de inasistencia esperando que Secretaría lo revise.
 *
 * Coincide con `JustificativoPendienteDto` del backend
 * (`GET /api/Justificativos/pendientes`). A diferencia de `DocumentoLegajo`,
 * este NO es una apuesta: está verificado contra el DTO real.
 *
 * No trae `estado` porque el endpoint filtra por `Estado == "Pendiente"`:
 * todos los que llegan acá están pendientes, por definición.
 */
export interface JustificativoPendiente {
  idJustificativo: number;
  nombreDocente: string;
  tipoInasistencia: string;

  /**
   * Ruta del PDF adjunto, o `null`.
   *
   * Es anulable porque el backend permite cargar un justificativo SIN archivo
   * cuando el tipo es exactamente "Causas Personales".
   *
   * Para abrirlo hay que pasarla por `urlArchivoSubido()` de
   * `core/configuracion/api.ts` — no concatenar a mano.
   */
  rutaArchivo: string | null;

  fechaCarga: Date;
}

/** Lo que hace falta para cargar un justificativo nuevo. */
export interface NuevoJustificativo {
  idUsuario: number;

  /**
   * ⚠️ Este texto tiene que coincidir LETRA POR LETRA con lo que espera el
   * backend. Si es exactamente `"Causas Personales"`, el PDF es opcional;
   * para cualquier otro valor el backend lo exige y responde 400 sin él.
   * Una mayúscula distinta cambia esa regla sin avisar.
   */
  tipoInasistencia: string;

  notaAdicional: string | null;
  fechaInasistenciaInicio: Date | null;
  fechaInasistenciaFin: Date | null;

  /** El PDF. `null` solo si `tipoInasistencia` es "Causas Personales". */
  documentoPdf: File | null;
}
