/**
 * Lo que el formulario de login le manda al backend.
 *
 * Coincide exactamente con el body que espera POST /api/Auth/login.
 * El backend autentica por DNI, NO por email.
 *
 * El `dni` viaja SIN puntos ("12345678", no "12.345.678").
 * De limpiarlo se encarga `normalizarDni()` en `../dni.ts`.
 */
export interface CredencialesLogin {
  dni: string;
  password: string;
}
