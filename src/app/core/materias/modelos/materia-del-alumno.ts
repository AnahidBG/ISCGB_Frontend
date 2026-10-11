/**
 * Una materia en la que el alumno está inscripto.
 *
 * Sale de `GET /api/Materias/mis-materias`. A diferencia de `MateriaDisponible`
 * trae la carrera y el curso, que sirven para distinguir dos materias que se
 * llaman igual — ver `etiquetaDeMateriaDelAlumno`.
 */
export interface MateriaDelAlumno {
  idMateria: number;
  nombre: string;

  /** Anulables en la base: `null` si no están cargados. */
  carrera: string | null;
  curso: string | null;
}

/**
 * Cómo se lee una materia del alumno en la lista desplegable.
 *
 * Mismo formato que `etiquetaDeMateria` (la del docente): la carrera y el
 * curso van entre paréntesis, separados por un punto medio, y solo si están
 * cargados. Sin ninguno de los dos queda el nombre solo.
 */
export function etiquetaDeMateriaDelAlumno(materia: MateriaDelAlumno): string {
  const contexto = [materia.carrera, materia.curso].filter(
    (dato): dato is string => dato !== null && dato.trim() !== '',
  );

  return contexto.length === 0 ? materia.nombre : `${materia.nombre} (${contexto.join(' · ')})`;
}
