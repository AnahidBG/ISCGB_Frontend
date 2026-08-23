/**
 * Los roles del instituto, tal como están cargados en la tabla `Roles`.
 *
 * El backend ya no manda el ID del rol: manda su NOMBRE, tanto en el token
 * como en el cuerpo del login. Por eso acá trabajamos con nombres y no con
 * números — un `'Docente'` se lee solo, un `'3'` hay que ir a buscarlo.
 */
export const ROLES = {
  director: 'Director',
  secretario: 'Secretario',
  docente: 'Docente',
  alumno: 'Alumno',
} as const;

/** Un rol válido del sistema. */
export type Rol = (typeof ROLES)[keyof typeof ROLES];

/**
 * Un rol tal como viaja en la respuesta de la API.
 *
 * Trae el id y el nombre. Nosotros nos quedamos con el nombre; el id se
 * mantiene en el tipo porque es lo que la API devuelve y este archivo
 * describe el contrato, no lo que nos gustaría que fuese.
 */
export interface RolApi {
  idRol: number;
  nombreRol: string | null;
}
