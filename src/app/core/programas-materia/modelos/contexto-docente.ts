import { FormatoCurricular } from './formato-curricular';

/** Una materia que el docente tiene a cargo, para elegirla de una lista. */
export interface MateriaACargo {
  idMateria: number;
  nombre: string;

  /**
   * Anulables en la base. Sirven para distinguir dos materias que se llaman
   * igual en carreras o cursos distintos — ver `etiquetaDeMateria`.
   */
  carrera: string | null;
  curso: string | null;
  idComision: number;
  nombreComision: string;

  // ── Datos del plan de estudios (Res. 166/23) ─────────────────────────────
  //
  // Existen en la tabla `materias` (`formato`, `horasCatedra`,
  // `horasTotales`), pero HOY `contexto-docente` no los manda: llegan en
  // `null` y el formulario los deja para cargar a mano. El día que el
  // backend los sume al `MateriaDocenteDto`, el formulario los autocompleta
  // solo, sin tocar el frontend.

  /** `null` si no vino o si el valor no es uno de la Res. 166/23. */
  formato: FormatoCurricular | null;
  /** Horas cátedra semanales. */
  horasCatedra: number | null;
  /** Horas totales de la materia según el plan. */
  horasTotales: number | null;
}

/**
 * Lo que el formulario de "Entregar programa de materia" necesita saber antes
 * de que el docente escriba nada: quién es y qué materias puede elegir.
 *
 * Existe para sacar del formulario los dos campos numéricos que se cargaban a
 * mano ("ID Docente" e "ID Materia"). Ninguna persona sabe de memoria su id
 * en la tabla `docentes`, y escribir el id equivocado guardaba el programa a
 * nombre de otra persona sin que nada avisara: el backend solo valida que el
 * id EXISTA, no que sea el tuyo.
 *
 * Sale de `GET /api/ProgramasMateria/contexto-docente/{idUsuario}`.
 */
export interface ContextoDocente {
  idDocente: number;

  /** Vacío = el docente existe pero todavía no le asignaron ninguna materia. */
  materias: MateriaACargo[];
}

/**
 * Cómo se lee una materia en la lista desplegable.
 *
 * La carrera y el curso van entre paréntesis solo si están cargados: dos
 * materias pueden llamarse "Práctica Docente" y ser distintas, y sin ese
 * contexto el docente no sabe cuál elegir.
 */
export function etiquetaDeMateria(materia: MateriaACargo): string {
  const contexto = [materia.carrera, materia.curso].filter(
    (dato): dato is string => dato !== null && dato.trim() !== '',
  );

  const datos = [...contexto, materia.nombreComision];
  return `${materia.nombre} (${datos.join(' · ')})`;
}
