import { ROLES } from './modelos/rol';
import { Sesion, tieneAlgunRol } from './modelos/sesion';

/**
 * A dónde mandar a una persona según los roles de su sesión.
 *
 * Los cuatro roles tienen panel propio. El orden importa solo para quien
 * tiene MÁS de un rol (el caso real: alguien que es Director y además dicta
 * una materia como Docente) — se elige el de MAYOR alcance, de mayor a
 * menor: Director > Secretario > Docente > Alumno. Ese panel es el único que
 * se muestra; no hay pantalla que fusione dos roles. Cada panel agrega por su
 * cuenta los accesos extra que sus otros roles habilitan (ver `PanelDirector`
 * y `PanelSecretario`, sección `enlaces`).
 *
 * Sin ningún rol asignado va a `/inicio`, que es el destino genérico para
 * cuando ninguno de los cuatro paneles le corresponde. Sin sesión, al login.
 *
 * Vive en `core/` y no adentro del login porque hay más de una pantalla que
 * necesita responder la misma pregunta — el login después de entrar, y el 404
 * para ofrecer "volver a mi panel". Tener esta decisión escrita dos veces es
 * pedir que se desincronicen el día que se agregue un rol.
 */
export function destinoSegunRoles(sesion: Sesion | null): string {
  if (sesion === null) {
    return '/login';
  }
  if (tieneAlgunRol(sesion, [ROLES.director])) {
    return '/director/panel';
  }
  if (tieneAlgunRol(sesion, [ROLES.secretario])) {
    return '/secretario/panel';
  }
  if (tieneAlgunRol(sesion, [ROLES.docente])) {
    return '/docente/panel';
  }
  if (tieneAlgunRol(sesion, [ROLES.alumno])) {
    return '/alumno/panel';
  }
  return '/inicio';
}
