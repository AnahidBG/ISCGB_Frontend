/**
 * Dirección base de la API de ISCGB.
 *
 * Hoy apunta a la máquina de desarrollo del backend. Antes de publicar el
 * sistema hay que reemplazarla por la URL real y pasarla a HTTPS.
 */
export const URL_BASE_API = 'http://localhost:5231';

/** Rutas de la API, en un solo lugar para no repetir strings sueltos. */
export const RUTAS_API = {
  login: `${URL_BASE_API}/api/Auth/login`,
  programasMateria: `${URL_BASE_API}/api/ProgramasMateria`,
  /**
   * PDF del programa ya guardado. El `idPrograma` lo devuelve el POST de
   * arriba: sin haber guardado antes, no hay PDF que pedir.
   */
  pdfPrograma: (idPrograma: number) =>
    `${URL_BASE_API}/api/ProgramasMateria/${idPrograma}/pdf`,
} as const;
