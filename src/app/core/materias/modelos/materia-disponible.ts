/**
 * Una materia del ISCGB, para elegirla en un desplegable.
 *
 * Sale de `GET /api/Materias/materias-disponibles`. El backend la llama
 * `nombreMateria`; acá queda `nombre`, igual que en `MateriaACargo`.
 */
export interface MateriaDisponible {
  idMateria: number;
  nombre: string;
}
