import { ROLES } from './modelos/rol';
import { Sesion, tieneAlgunRol } from './modelos/sesion';

/**
 * Qué rol se muestra debajo del nombre en el encabezado de los paneles.
 *
 * ── Por qué existe (01/09/2026) ───────────────────────────────────────────
 * Antes, cada pantalla decidía esto por su cuenta y de dos maneras distintas,
 * las dos mal:
 *
 *   · Seis pantallas lo tenían ESCRITO A MANO en el HTML
 *     (`rolPrincipal="Secretario"` en Control de Legajos,
 *     `rolPrincipal="Director"` en Alta de Usuario, etc). Como el texto era
 *     fijo, mostraba el rol de la PANTALLA y no el de quien la estaba
 *     mirando: un Director que entraba a Control de Legajos desde el menú
 *     pasaba a figurar como "Secretario" en su propio encabezado. El rol
 *     parecía cambiar solo al navegar — que es justamente lo reportado.
 *
 *   · Las otras cinco usaban `sesion()?.roles[0]`, o sea el primer rol en el
 *     orden en que lo devuelve el backend. Para quien tiene un solo rol
 *     funciona de casualidad; para el caso real de alguien que es Director
 *     Y ADEMÁS Docente, muestra el que la API haya puesto primero, que no
 *     tiene por qué ser el de mayor alcance ni ser estable entre pantallas.
 *
 * Ahora hay un solo lugar donde se decide, y el criterio es el MISMO que usa
 * `destinoSegunRoles` para elegir a qué panel entrar: de mayor a menor
 * alcance, Director > Secretario > Docente > Alumno. Que las dos preguntas
 * ("¿a qué panel va?" y "¿qué rol muestro?") se respondan con el mismo orden
 * es lo que hace que el encabezado no se contradiga con el panel en el que
 * la persona está parada.
 *
 * El rol SIEMPRE sale de la sesión, que es lo que devolvió el backend al
 * loguearse. Ninguna pantalla debería volver a escribirlo a mano.
 */
export function rolPrincipalDe(sesion: Sesion | null): string {
  if (sesion === null) {
    return '';
  }

  if (tieneAlgunRol(sesion, [ROLES.director])) {
    return ROLES.director;
  }
  if (tieneAlgunRol(sesion, [ROLES.secretario])) {
    return ROLES.secretario;
  }
  if (tieneAlgunRol(sesion, [ROLES.docente])) {
    return ROLES.docente;
  }
  if (tieneAlgunRol(sesion, [ROLES.alumno])) {
    return ROLES.alumno;
  }

  // Un rol que no es ninguno de los cuatro conocidos (el día que se agregue
  // uno en la base): se muestra tal como vino en vez de dejar el lugar vacío.
  return sesion.roles[0] ?? '';
}
