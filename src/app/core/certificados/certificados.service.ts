import { Observable } from 'rxjs';

/** Las dos variantes del certificado que genera el backend. */
export type VarianteCertificado = 'regular' | 'regular-con-horario';

export const MENSAJE_ERROR_CERTIFICADO =
  'No pudimos generar el certificado. Intentá de nuevo en un momento.';

/** 400 de `CertificadosController`: le falta nombre, apellido o DNI. */
export const MENSAJE_DATOS_INCOMPLETOS =
  'Te faltan datos personales (nombre, apellido o DNI) para emitir el certificado. ' +
  'Pasá por Secretaría para completarlos.';

/** 404 de `CertificadosController`: la sesión no tiene fila en `Alumnos`. */
export const MENSAJE_NO_ES_ALUMNO =
  'Tu usuario no figura como alumno en el sistema, así que no podemos emitir el certificado. ' +
  'Consultá en Secretaría.';

/**
 * Certificado de alumno regular — Sprint 2, "Solicitud de certificado de
 * alumno regular (Estudiante)" (SCRUM-12).
 *
 * Lo genera el BACKEND (`CertificadosController` + `GeneradorPDFCertificado`
 * con QuestPDF): trae el nombre del instituto, el sello institucional, la
 * fecha de emisión y, en la variante con horario, las líneas de días y
 * horarios de cursada para que Preceptoría las complete. SCRUM-128 dejaba
 * abierto "si lo hace el Back o el Front" — lo resolvió el backend, y el
 * frontend deja de armarlo por su cuenta con jsPDF.
 */
export abstract class CertificadosService {
  /**
   * Pide el PDF del alumno de la sesión. No lleva id: el backend lo saca del
   * propio token (`[Authorize]` + claim `NameIdentifier`).
   *
   * Falla con `MENSAJE_DATOS_INCOMPLETOS`, `MENSAJE_NO_ES_ALUMNO` o
   * `MENSAJE_ERROR_CERTIFICADO`. Un 401 (token vencido) lo resuelve
   * `sesionInterceptor` mandando al login.
   */
  abstract descargar(variante: VarianteCertificado): Observable<Blob>;
}
