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
 * El id de cada rol en la tabla `Roles`, para los endpoints que lo piden
 * como número.
 *
 * Durante el Sprint 1 el frontend evitó a propósito tener esta tabla: no
 * había ningún contrato que fijara los números. Ahora lo fija el propio
 * backend — `CargaUsuarioDto.IdRol` documenta "1: Director, 2: Secretario,
 * 3: Docente, 4: Alumno", y `UsuariosAdminController` rechaza cualquier
 * `IdRol` fuera de 1..4 y trata el 3 como Docente para crear la fila en
 * `Docentes`. Estos números son parte del contrato, no una suposición.
 *
 * Si alguna vez cambian en la base, cambian en el backend primero y acá
 * después, en este único lugar.
 */
export const ID_ROL: Readonly<Record<Rol, number>> = {
  [ROLES.director]: 1,
  [ROLES.secretario]: 2,
  [ROLES.docente]: 3,
  [ROLES.alumno]: 4,
};

/** El nombre de un rol a partir de su id, o `null` si no es uno de los cuatro. */
export function rolPorId(idRol: number): Rol | null {
  const encontrado = (Object.entries(ID_ROL) as [Rol, number][]).find(([, id]) => id === idRol);
  return encontrado?.[0] ?? null;
}

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
