/**
 * La sesión del usuario ya ordenada, tal como la usa el resto del frontend.
 *
 * Se arma combinando la `RespuestaLogin` (el body) con el `JwtPayload`
 * (el contenido del token). Ningún componente debería tocar `RespuestaLogin`
 * ni `JwtPayload` directamente: trabajan siempre con `Sesion`.
 *
 * Así, si el backend cambia un nombre de campo, se arregla en un solo lugar
 * y el resto de la aplicación ni se entera.
 */
export interface Sesion {
  /** El JWT crudo. Es lo que viaja en la cabecera Authorization. */
  token: string;
  /** ID del usuario. */
  idUsuario: number;
  /** Nombre y apellido. Puede venir vacío si el backend no los tiene cargados. */
  nombreCompleto: string;
  dni: string;
  email: string;
  /** ID del rol tal como viene en el token. Ver la nota en `JwtPayload`. */
  idRol: string;
  /** Momento exacto en que el token deja de servir. */
  venceEl: Date;
}
