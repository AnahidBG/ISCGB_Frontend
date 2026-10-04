import { ROLES } from '../auth/modelos/rol';

/**
 * Quién usa el buscador del encabezado: Director y Secretario.
 *
 * Los resultados incluyen nombre y DNI de cualquier persona del instituto y
 * los justificativos de todos — información que Docente y Alumno no tienen
 * por qué ver. El backend (`BuscadorController`) no tiene `[Authorize]`, así
 * que hoy esta es la única barrera, y es solo de interfaz: hay que pedirle al
 * backend `[Authorize(Roles = "Director,Secretario")]`.
 *
 * La misma lista protege la ruta `/buscar` en `app.routes.ts`.
 */
export const ROLES_QUE_BUSCAN = [ROLES.director, ROLES.secretario] as const;

/**
 * ¿Se muestra el buscador para este rol principal (`rolPrincipalDe`)?
 *
 * Alcanza con el rol PRINCIPAL porque va de mayor a menor alcance: quien es
 * Director o Secretario, además de cualquier otro rol, siempre tiene uno de
 * esos dos como principal. Caso por defecto: no.
 */
export function puedeBuscar(rolPrincipal: string): boolean {
  return (ROLES_QUE_BUSCAN as readonly string[]).includes(rolPrincipal);
}
