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
