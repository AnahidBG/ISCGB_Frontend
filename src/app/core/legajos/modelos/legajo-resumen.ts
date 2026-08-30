/**
 * `GET /api/Legajos/resumen-estado`: todos los legajos agrupados por persona.
 * Coincide con `ResumenLegajoDto` del backend.
 *
 * Ojo que devuelve TODOS los usuarios, también los que no subieron nada, así
 * que `documentos` puede venir vacío.
 */
export interface LegajoResumenUsuario {
  idUsuario: number;

  /** Puede llegar como " " si el usuario no tiene nombre ni apellido cargados. */
  nombreCompleto: string;

  /** El backend manda la cadena literal `"Sin DNI"` cuando el campo es null. */
  dni: string;

  documentos: DocumentoResumenLegajo[];
}

export interface DocumentoResumenLegajo {
  idLegajo: number;

  /** `int?` en el DTO aunque la columna no lo sea, así que lo tipo anulable. */
  idTipoDoc: number | null;

  /** Texto libre y anulable en la base. `app-insignia-estado` ya lo contempla. */
  estado: string | null;

  rutaArchivo: string | null;
}
