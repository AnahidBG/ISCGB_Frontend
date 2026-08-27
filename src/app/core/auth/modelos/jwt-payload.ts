/**
 * El contenido del token JWT que devuelve el login.
 *
 * Se obtiene decodificando la parte del medio del token. Ejemplo real:
 *
 *   { "nameid": "1", "DNI": "43880335", "role": "Docente",
 *     "nbf": 1787513839, "exp": 1787521039, "iat": 1787513839 }
 *
 * ⚠️ `role` viene con el NOMBRE del rol, no con su ID. Y puede llegar como
 * texto o como arreglo: el backend agrega un claim por cada rol del usuario,
 * y cuando hay más de uno el JWT los serializa juntos en un arreglo.
 *
 *     un rol   → "role": "Docente"
 *     dos roles→ "role": ["Docente", "Director"]
 *
 * Por eso el tipo es `string | string[]`. Tratarlo como `string` a secas
 * funciona hasta que aparece la primera persona con dos roles, y ahí falla
 * en silencio.
 *
 * De todos modos el frontend NO usa este campo para saber los roles: los
 * toma de `RespuestaLogin.roles`, que llega en el cuerpo. Del token solo
 * necesitamos `exp`.
 */
export interface JwtPayload {
  /** ID del usuario, como texto. */
  nameid: string;
  /** DNI del usuario. */
  DNI: string;
  /** Nombre del rol, o varios si el usuario tiene más de uno. */
  role: string | string[];
  /** No válido antes de (segundos desde 1970). */
  nbf: number;
  /** Vence el (segundos desde 1970). El token dura 2 horas. */
  exp: number;
  /** Emitido el (segundos desde 1970). */
  iat: number;
}
