/**
 * Lo que el formulario de login le manda al backend.
 *
 * Coincide exactamente con el body que espera POST /api/Auth/login.
 * El backend autentica por DNI, NO por email.
 *
 * El `dni` viaja SIN puntos ("43880335", no "43.880.335").
 * De limpiarlo se encarga `normalizarDni()` en `../dni.ts`.
 */
export interface CredencialesLogin {
  dni: string;
  password: string;
}
