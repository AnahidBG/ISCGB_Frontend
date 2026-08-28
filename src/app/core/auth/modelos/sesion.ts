import { RolApi } from './rol';

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
  /**
   * Los NOMBRES de los roles del usuario ("Docente", "Director"...).
   *
   * Es un arreglo porque una persona puede tener varios: en el instituto
   * un docente puede ser además director suplente. Guardar un solo rol
   * obligaría a elegir cuál, y esa decisión no es del frontend.
   */
  roles: string[];

  /**
   * Los roles con su ID además del nombre.
   *
   * Existe porque hay endpoints que piden el ID y no el nombre — el caso
   * concreto es `GET /api/Legajos/requeridos-por-rol/{idRol}`, que dice qué
   * documentos le corresponden a cada rol. Sin esto habría que mantener en
   * el frontend una tabla de "Docente = 2" que se desincroniza con la base
   * en cuanto alguien agrega un rol.
   *
   * Es OPCIONAL a propósito: `AuthMockService` no lo completa (no tiene ids
   * reales que dar), y una sesión guardada en `sessionStorage` de antes de
   * este cambio tampoco lo tiene. Quien lo use tiene que contemplar que
   * falte, no darlo por hecho.
   */
  rolesConId?: RolApi[];

  /** Momento exacto en que el token deja de servir. */
  venceEl: Date;
}

/**
 * ¿La sesión tiene alguno de los roles pedidos?
 *
 * Se usa tanto para decidir qué mostrar como para el `roleGuard`. Alcanza
 * con tener UNO de los roles de la lista, no todos.
 *
 * Sin sesión devuelve `false`: quien no entró no tiene ningún rol.
 */
export function tieneAlgunRol(sesion: Sesion | null, permitidos: readonly string[]): boolean {
  if (sesion === null) {
    return false;
  }

  return sesion.roles.some((rol) => permitidos.includes(rol));
}

/**
 * El ID de uno de los roles de la sesión, buscado por nombre.
 *
 * Devuelve `null` si esa sesión no tiene ese rol, o si viene de una fuente
 * que no trae los ids (el mock, o una sesión guardada vieja). Quien lo use
 * tiene que manejar ese `null` mostrando algo razonable, no asumir un número.
 */
export function idDeRol(sesion: Sesion | null, nombreRol: string): number | null {
  const encontrado = sesion?.rolesConId?.find((rol) => rol.nombreRol === nombreRol);
  return encontrado?.idRol ?? null;
}
