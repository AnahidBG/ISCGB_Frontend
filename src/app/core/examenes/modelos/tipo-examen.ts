/**
 * Un tipo de examen de los que carga el instituto: "Parcial", "Coloquio"...
 *
 * Se muestran con el nombre que trae el backend, tal cual. Sale de
 * `GET .../tipos-examen`.
 */
export interface TipoExamen {
  idTipoExamen: number;
  nombre: string;
}
