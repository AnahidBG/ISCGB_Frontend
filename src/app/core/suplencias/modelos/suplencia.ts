/**
 * La suplencia de un docente (`Docentes.es_suplente`, con fecha de inicio y de
 * fin). No es lo mismo que "director suplente", que es otra columna y se marca
 * al dar de alta o editar al usuario.
 */

/** Lo que se manda para asignar una suplencia. */
export interface NuevaSuplencia {
  /** El de la tabla `Docentes`, no el de `Usuarios`. */
  idDocente: number;
  /** "2026-11-02". */
  desde: string;
  /** "2026-11-30", o `null` si todavía no se sabe cuándo termina. */
  hasta: string | null;
}

/** Cómo quedó la persona después de asignar o dar de baja la suplencia. */
export interface ResultadoSuplencia {
  esSuplente: boolean;
  /** `false` = la cuenta quedó inactiva: era solo Docente y se le dio de baja la suplencia. */
  cuentaActiva: boolean;
}
