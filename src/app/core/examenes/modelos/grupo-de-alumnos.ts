/**
 * Un grupo de alumnos para el límite de exámenes por día: el año (el curso de la
 * materia) y la comisión. Desde el 10/11/2026 el límite se cuenta por grupo, y
 * `estado-mes` lo recibe como la materia y la comisión que se están por cargar.
 */
export interface GrupoDeAlumnos {
  idMateria: number;
  /**
   * Sin comisión, el grupo es el año entero: es el caso de las mesas de examen,
   * que son para todas las comisiones de la materia. Entonces un día figura
   * lleno si ALGUNA comisión de ese año llegó al límite.
   */
  idComision?: number;
}
