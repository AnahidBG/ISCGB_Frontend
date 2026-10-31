/**
 * Los sitios de afuera a los que ISCGB lleva. Igual que las rutas de la API
 * (`api.ts`), se escriben en un solo lugar: si el instituto cambia una dirección,
 * se cambia acá.
 */

/** Quién entra a SIAADE. Cada perfil tiene su propia puerta de entrada. */
export type PerfilSiaade = 'alumno' | 'docente';

/**
 * SIAADE, el sistema académico del instituto (SCRUM-15). Es un sitio aparte, con
 * su propio usuario y contraseña: ISCGB solo lleva hasta la entrada. Alumnos y
 * docentes entran por direcciones distintas.
 */
export const ENLACE_SIAADE: Readonly<Record<PerfilSiaade, string>> = {
  alumno: 'https://www.gesteal.com.ar/si/adm/adinisi.php?A=1',
  docente: 'https://www.gesteal.com.ar/si/adm/adinisi.php',
};

/** El libro de temas de un año de la carrera. */
export interface LibroDeTemasDelAnio {
  /** Cómo se muestra: "Primer año". */
  anio: string;
  /** La carpeta de Google Drive del instituto. */
  enlace: string;
}

/**
 * Los libros de temas (SCRUM-232): una carpeta de Google Drive por año, que
 * arma el instituto. Son las del ciclo 2026 (`IS-CGB_LibroTemas_1ro_2026` y
 * `IS-CGB_LibroTemas_2do_2026`); cuando el instituto pase las del año
 * siguiente, o la de otro año, se cambian o se agregan acá.
 */
export const LIBROS_DE_TEMAS: readonly LibroDeTemasDelAnio[] = [
  {
    anio: 'Primer año',
    enlace: 'https://drive.google.com/drive/folders/1IyQPTeZAyP9aGeKV7dNMLSt06ZSXU0ld',
  },
  {
    anio: 'Segundo año',
    enlace: 'https://drive.google.com/drive/folders/1GREfOERRRrVKdJYtHXaf6t8obmqoGlyJ',
  },
];
