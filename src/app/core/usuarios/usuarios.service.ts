import { Observable } from 'rxjs';
import { NuevoUsuario } from './modelos/nuevo-usuario';
import { UsuarioInstitucional } from './modelos/usuario-institucional';

/** Cuando el alta falla por algo que no es culpa de lo que cargó la persona. */
export const MENSAJE_ERROR_ALTA_USUARIO =
  'No pudimos dar de alta al usuario. Intentá de nuevo en un momento.';

/**
 * El backend todavía no tiene el endpoint de alta.
 *
 * Se distingue del error genérico a propósito: no es una falla pasajera y
 * reintentar no lo va a arreglar. Quien esté probando la pantalla tiene que
 * entender que falta trabajo del otro lado, no que se rompió algo.
 */
export const MENSAJE_ALTA_NO_DISPONIBLE =
  'El servidor todavía no tiene habilitada el alta de usuarios. La pantalla está lista y ' +
  'empieza a funcionar en cuanto el backend publique el endpoint (ver docs/contrato-alta-usuario.md).';

/** El DNI o el email ya están en uso por otra persona. */
export const MENSAJE_USUARIO_DUPLICADO =
  'Ya existe un usuario con ese DNI o ese correo. Revisá los datos o buscá a la persona en el listado.';

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

  /**
   * Da de alta a una persona. Solo el Director (ISCGB-PROJECT.md → Sprint 2,
   * "Gestión de usuarios y roles").
   *
   * ⚠️ El backend NO tiene este endpoint todavía. Lo único que existe hoy es
   * `POST /api/Auth/crear-usuario-prueba`, que acepta solo `{ dni, password }`
   * y escribe a mano `email = "prueba@test.com"` y `IdRol = 1` — su propio
   * comentario en el código dice "esto es de prueba. No quedaría de esta
   * forma". Usarlo desde acá crearía usuarios basura en la base real, así que
   * la implementación HTTP apunta a `POST /api/Usuarios`, que es donde
   * corresponde, y traduce el 404/405 de hoy a un mensaje que lo explica.
   *
   * Ver docs/contrato-alta-usuario.md: ahí está el DTO exacto que hay que
   * implementar del lado del backend para que esta pantalla funcione sin
   * tocar una línea de Angular.
   */
  abstract crear(usuario: NuevoUsuario): Observable<void>;
}
