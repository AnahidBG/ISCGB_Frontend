import { Observable } from 'rxjs';
import { PerfilUsuario } from './modelos/perfil-usuario';
import { Provincia } from './modelos/provincia';
import { UsuarioDetalle } from './modelos/usuario-detalle';
import { UsuarioInstitucional } from './modelos/usuario-institucional';

/** Cuando el alta falla por algo que no es culpa de lo que cargó la persona. */
export const MENSAJE_ERROR_ALTA_USUARIO =
  'No pudimos dar de alta al usuario. Intentá de nuevo en un momento.';

/** Cuando la edición falla por algo que no es culpa de lo que cargó la persona. */
export const MENSAJE_ERROR_EDITAR_USUARIO =
  'No pudimos guardar los cambios. Intentá de nuevo en un momento.';

/** Cuando la baja falla por algo que no es culpa de quien la pidió. */
export const MENSAJE_ERROR_BAJA_USUARIO =
  'No pudimos dar de baja al usuario. Intentá de nuevo en un momento.';

/** Cuando la reactivación falla por algo que no es culpa de quien la pidió. */
export const MENSAJE_ERROR_REACTIVAR_USUARIO =
  'No pudimos reactivar al usuario. Intentá de nuevo en un momento.';

/**
 * El backend todavía no tiene publicados los endpoints de gestión de
 * usuarios.
 *
 * `UsuariosAdminController` (alta, modificar, baja, reactivar) existe en la rama
 * `CargaDeUsuarios` de ISCGB_Backend pero todavía no está en `main`. Contra
 * un backend sin esa rama, la ruta no existe y ASP.NET responde 404 sin
 * cuerpo. Se distingue del error genérico a propósito: reintentar no lo va a
 * arreglar, falta mergear del otro lado.
 */
export const MENSAJE_GESTION_NO_DISPONIBLE =
  'El servidor todavía no tiene habilitada la gestión de usuarios (alta, modificación y baja). ' +
  'La pantalla está lista y empieza a funcionar en cuanto el backend publique UsuariosAdmin.';

/** Lo que muestra la pantalla cuando el backend confirma la modificación. */
export function mensajePerfilActualizado(nombre: string): string {
  // SCRUM-139: "El perfil del usuario ha sido actualizado correctamente",
  // y si es posible con el nombre en lugar de "usuario".
  const quien = nombre.trim();
  return quien === ''
    ? 'El perfil del usuario ha sido actualizado correctamente.'
    : `El perfil de ${quien} ha sido actualizado correctamente.`;
}

/**
 * Usuarios del instituto: lectura (panel del Director) y gestión de perfiles
 * — Sprint 2, "Gestión de usuarios y roles" (SCRUM-16).
 *
 * Mismo patrón que `AuthService`: una clase abstracta con una implementación
 * HTTP real y una simulada, intercambiables desde `app.config.ts`.
 *
 * Endpoints del backend:
 *
 *   · `GET  /api/Usuarios`                     → `listar`   (main)
 *   · `GET  /api/Usuarios/{id}`                → `obtener`  (main)
 *   · `POST /api/UsuariosAdmin/alta`           → `crear`    (rama CargaDeUsuarios)
 *   · `PUT  /api/UsuariosAdmin/modificar/{id}` → `actualizar` (rama CargaDeUsuarios)
 *   · `PUT  /api/UsuariosAdmin/baja/{id}`      → `darDeBaja` (rama CargaDeUsuarios)
 *   · `GET  /api/Ubicaciones/paises` y `.../paises/{id}/provincias`
 *                                              → `listarProvincias`
 */
export abstract class UsuariosService {
  /** Todas las personas del instituto, activas e inactivas, con sus roles. */
  abstract listar(): Observable<UsuarioInstitucional[]>;

  /** El detalle de una persona, para precargar "Editar Usuario". */
  abstract obtener(idUsuario: number): Observable<UsuarioDetalle>;

  /**
   * Da de alta a una persona. Devuelve el mensaje de confirmación.
   *
   * Falla con el mensaje del backend cuando lo hay (rol inválido, ya existe
   * un director suplente), con `MENSAJE_GESTION_NO_DISPONIBLE` si el
   * endpoint no está publicado, o con `MENSAJE_ERROR_ALTA_USUARIO`.
   */
  abstract crear(perfil: PerfilUsuario): Observable<string>;

  /**
   * Guarda los cambios del perfil. Devuelve el mensaje de confirmación
   * ("El perfil de X ha sido actualizado correctamente").
   */
  abstract actualizar(idUsuario: number, perfil: PerfilUsuario): Observable<string>;

  /**
   * Baja lógica: la cuenta pasa a inactiva y NO se borra nada — ni los
   * datos ni la documentación histórica (criterio de aceptación). Si era
   * director suplente, deja de serlo.
   */
  abstract darDeBaja(idUsuario: number): Observable<string>;

  /** Reactiva una cuenta dada de baja sin modificar sus datos históricos. */
  abstract reactivar(idUsuario: number): Observable<string>;

  /**
   * Todas las provincias de todos los países, con el id real de la base y el
   * nombre del país, para el desplegable "Lugar de nacimiento".
   *
   * El backend no tiene un endpoint "todas las provincias": se piden los
   * países y después las provincias de cada uno. Un país sin provincias
   * aporta cero (no es un error). Falla si no se pudo traer la lista.
   */
  abstract listarProvincias(): Observable<Provincia[]>;
}
