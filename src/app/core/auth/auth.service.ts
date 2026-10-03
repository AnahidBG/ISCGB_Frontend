import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { CredencialesLogin } from './modelos/credenciales-login';
import { Sesion } from './modelos/sesion';

/**
 * Mensaje único para credenciales inválidas.
 *
 * El backend hoy distingue "Contraseña incorrecta." de "DNI no encontrado",
 * lo que le permitiría a un atacante averiguar qué DNIs existen en el
 * instituto probando uno por uno. El frontend NO reenvía esa distinción:
 * muestra siempre lo mismo, falle lo que falle.
 */
export const MENSAJE_CREDENCIALES_INVALIDAS = 'El DNI o la contraseña no son correctos.';

/** Cuando el servidor no responde (está apagado, no hay internet, CORS, etc.). */
export const MENSAJE_SIN_CONEXION =
  'No pudimos conectarnos con el servidor. Intentá de nuevo en un momento.';

/**
 * El enlace para crear la contraseña no sirve: no existe, ya se usó o venció.
 *
 * Es UN solo mensaje a propósito. El backend distingue "El enlace es inválido."
 * de "El enlace ha expirado." con texto suelto en el body, y leerlo sería
 * frágil (cualquier cambio de redacción rompería la distinción). Además el
 * remedio para la persona es el mismo: no hay endpoint para reenviar el link,
 * así que lo único que puede hacer es pedirlo a la Dirección.
 */
export const MENSAJE_ENLACE_INVALIDO =
  'Este enlace no es válido o ya venció. Comunicate con la Dirección del instituto para que te envíen uno nuevo.';

/** Falla inesperada al guardar la contraseña (5xx u otro status no previsto). */
export const MENSAJE_ERROR_CREAR_PASSWORD =
  'No pudimos guardar tu contraseña. Intentá de nuevo en un momento.';

/**
 * Contrato de autenticación.
 *
 * Esto es una clase ABSTRACTA a propósito: define QUÉ se puede hacer,
 * pero no CÓMO. Existen dos implementaciones:
 *
 *   · `AuthMockService` — datos inventados, no necesita backend.
 *   · `AuthHttpService` — pega contra la API real de Angel.
 *
 * Los componentes piden `AuthService` y nunca se enteran de cuál les tocó.
 * Cambiar de una a otra es una línea en `app.config.ts`.
 *
 * ¿Por qué esta vuelta? Porque el backend todavía está en construcción.
 * Si el login dependiera de que la API esté levantada, no podríamos avanzar
 * los días que no lo está. Y si algo falla, sabemos de qué lado mirar:
 * si anda con el mock y falla con HTTP, el problema no es nuestro.
 *
 * Es la misma idea que usa el backend con `IDocumentService` — depender de
 * un contrato y no de una implementación concreta.
 */
export abstract class AuthService {
  /** La sesión actual, o `null` si nadie inició sesión. */
  abstract readonly sesion: Signal<Sesion | null>;

  /** ¿Hay alguien con la sesión abierta? */
  abstract readonly estaAutenticado: Signal<boolean>;

  /**
   * Valida las credenciales contra el servidor.
   *
   * Falla con `Error(MENSAJE_CREDENCIALES_INVALIDAS)` si son incorrectas,
   * o con `Error(MENSAJE_SIN_CONEXION)` si el servidor no contesta.
   */
  abstract iniciarSesion(credenciales: CredencialesLogin): Observable<Sesion>;

  /**
   * Define la contraseña de un usuario recién dado de alta, con el token del
   * enlace que le llegó por mail. No requiere sesión.
   *
   * Vive acá y no en `UsuariosService` porque es un asunto de credenciales,
   * aunque el endpoint cuelgue de `UsuariosAdmin`.
   *
   * Falla con `Error(MENSAJE_ENLACE_INVALIDO)` si el token no sirve,
   * `Error(MENSAJE_SIN_CONEXION)` si el servidor no contesta, o
   * `Error(MENSAJE_ERROR_CREAR_PASSWORD)` ante cualquier otra falla.
   */
  abstract establecerPassword(token: string, nuevaPassword: string): Observable<void>;

  /** Borra la sesión actual. */
  abstract cerrarSesion(): void;
}
