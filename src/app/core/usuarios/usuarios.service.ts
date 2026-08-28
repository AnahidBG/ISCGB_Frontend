import { Observable } from 'rxjs';
import { UsuarioInstitucional } from './modelos/usuario-institucional';

/**
 * Contrato de lectura de usuarios del instituto.
 *
 * Es lo que necesita el panel del Director: quién está dado de alta y en
 * qué estado está su legajo (ISCGB-PROJECT.md → permisos de Director,
 * "visualización global de alumnos, docentes y secretarios").
 *
 * Mismo patrón que `AuthService`: una clase abstracta, y hoy una sola
 * implementación (`UsuariosMockService`). Falta la versión HTTP porque el
 * backend todavía no tiene un endpoint para esto — no está ni en
 * `docs/contrato-api.md` ni confirmado con Angel. Antes de escribir
 * `UsuariosHttpService`, leer docs/alcance-dashboard-director.md para no
 * inventar una forma de respuesta que después no coincida con la real.
 */
export abstract class UsuariosService {
  /** Todas las personas del instituto con su rol y el estado de su legajo. */
  abstract listar(): Observable<UsuarioInstitucional[]>;
}
