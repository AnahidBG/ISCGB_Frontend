import { ROLES, RolApi } from '../auth/modelos/rol';
import { Sesion } from '../auth/modelos/sesion';

/** De mayor a menor exigencia documental. Ver `idRolDocumental`. */
const ORDEN_DOCUMENTAL = [ROLES.docente, ROLES.alumno, ROLES.secretario, ROLES.director];

/**
 * Con qué rol le pedimos a esta persona su documentación.
 *
 * Una persona puede tener más de un rol (`Usuarios_roles` lo permite: el caso
 * real es un director que además dicta una materia). Los documentos que el
 * instituto exige dependen del rol, así que con varios hay que elegir uno, y
 * se elige el de MAYOR exigencia documental: un director que da clase
 * presenta lo de Docente, que es lo más completo.
 *
 * Ojo: este orden es distinto del de `destinoSegunRoles`, y no es un error.
 * Ahí se elige el rol de mayor ALCANCE (a qué panel entra: Director primero);
 * acá el de mayor EXIGENCIA documental (qué papeles presenta: Docente
 * primero). Son dos preguntas distintas sobre la misma persona.
 *
 * Devuelve `null` cuando la sesión no trae los ids de sus roles — viene del
 * mock, o quedó guardada en `sessionStorage` de antes de que `rolesConId`
 * existiera. Quien lo use tiene que contemplar ese caso, no asumir un número.
 */
export function idRolDocumental(sesion: Sesion | null): number | null {
  return idRolDocumentalDe(sesion?.rolesConId ?? []);
}

/**
 * Lo mismo que `idRolDocumental`, pero para los roles de CUALQUIER persona,
 * no de la sesión. Lo usa la revisión de un legajo ajeno: los documentos que
 * hay que exigirle a la persona revisada dependen de SU rol, no del de
 * Secretaría o Dirección que la está mirando.
 */
export function idRolDocumentalDe(roles: readonly RolApi[]): number | null {
  for (const nombre of ORDEN_DOCUMENTAL) {
    const encontrado = roles.find((rol) => rol.nombreRol === nombre);
    if (encontrado !== undefined) {
      return encontrado.idRol;
    }
  }
  return null;
}
