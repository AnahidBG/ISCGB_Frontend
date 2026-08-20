/**
 * El contenido del token JWT que devuelve el login.
 *
 * Se obtiene decodificando la parte del medio del token. Ejemplo real:
 *
 *   { "nameid": "1", "DNI": "43880335", "role": "1",
 *     "nbf": 1787094079, "exp": 1787101279, "iat": 1787094079 }
 *
 * ⚠️ `role` llega como el ID del rol en formato texto ("1"), no como su
 * nombre. Sin la tabla de equivalencias no sabemos si "1" es Director o
 * Alumno. Pendiente de confirmar con backend.
 *
 * ⚠️ `role` es UNO SOLO, pero la base de datos permite varios roles por
 * usuario (tabla `Usuarios_roles`). Cuando el backend soporte múltiples
 * roles, este campo pasa a ser un arreglo.
 */
export interface JwtPayload {
  /** ID del usuario, como texto. */
  nameid: string;
  /** DNI del usuario. */
  DNI: string;
  /** ID del rol, como texto. */
  role: string;
  /** No válido antes de (segundos desde 1970). */
  nbf: number;
  /** Vence el (segundos desde 1970). El token dura 2 horas. */
  exp: number;
  /** Emitido el (segundos desde 1970). */
  iat: number;
}
