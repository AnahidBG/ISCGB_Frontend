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

  /** Borra la sesión actual. */
  abstract cerrarSesion(): void;
}
