/**
 * Una materia que dicta el docente, en una comisión.
 *
 * Una misma materia en dos comisiones son dos elementos: lo que se elige al
 * registrar un parcial es el par. Sale de `GET .../mis-materias-docente`.
 */
export interface MateriaDelDocente {
  idMateria: number;
  materia: string;
  /** Anulable en la base: `null` si no está cargada. */
  carrera: string | null;
  idComision: number;
  comision: string;
}

/** Identifica el par materia-comisión: es el valor de cada opción del desplegable. */
export function claveDeMateriaDelDocente(materia: MateriaDelDocente): string {
  return `${materia.idMateria}-${materia.idComision}`;
}

/**
 * Cómo se lee la materia en el desplegable: "Programación II · Comisión A". Si la
 * carrera está cargada va al final, entre paréntesis, para distinguir dos
 * materias que se llaman igual.
 */
export function etiquetaDeMateriaDelDocente(materia: MateriaDelDocente): string {
  const base = `${materia.materia} · ${materia.comision}`;
  return materia.carrera === null ? base : `${base} (${materia.carrera})`;
}
