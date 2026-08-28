/**
 * Un tipo de documento que un rol tiene que presentar.
 *
 * Coincide con lo que devuelve `GET /api/Legajos/requeridos-por-rol/{idRol}`
 * (tabla `roles_tipos_documentos`). Verificado contra el controlador real.
 */
export interface DocumentoRequerido {
  idTipoDoc: number;
  nombreDocumento: string;

  /** `false` = lo puede presentar pero no es obligatorio para completar el legajo. */
  obligatorio: boolean;

  /** `true` = se vence y hay que volver a presentarlo cada año (ej. apto médico). */
  anual: boolean;
}

/** Lo que hace falta para subir un documento al legajo. */
export interface NuevoDocumentoLegajo {
  idUsuario: number;
  idTipoDoc: number;

  /** Solo para documentos anuales. `null` en los que no vencen. */
  fechaVencimiento: Date | null;

  /** `true` si además lo entregó en papel en Secretaría. */
  presentadoFisico: boolean;

  /**
   * El archivo.
   *
   * ⚠️ Tiene que ser PDF (CLAUDE.md, regla de negocio #1). El frontend valida
   * la extensión por UX, pero eso NO es seguridad: cualquiera renombra un
   * .exe a .pdf. La validación real —por contenido, mirando los primeros
   * bytes— va del lado del backend, y hoy `LegajosController` no la hace
   * (ver docs/verificacion-backend.md → punto 5).
   */
  archivo: File;
}
