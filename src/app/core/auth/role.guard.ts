import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { destinoSegunRoles } from './destino-por-rol';
import { tieneAlgunRol } from './modelos/sesion';

/** Query param con el que los paneles avisan que se bloqueó una pantalla por rol. */
export const PARAMETRO_ACCESO_DENEGADO = 'accesoDenegado';

/**
 * Deja pasar solo a quien tenga alguno de los roles indicados.
 *
 * No es un guard sino una FÁBRICA de guards: se la llama con los roles
 * permitidos y devuelve el guard que Angular va a ejecutar. Así una misma
 * función sirve para todas las rutas, cada una con su lista.
 *
 *     canActivate: [authGuard, roleGuard(ROLES.docente)]
 *     canActivate: [authGuard, roleGuard(ROLES.director, ROLES.secretario)]
 *
 * Va SIEMPRE después de `authGuard`: primero se verifica que haya sesión,
 * después qué puede hacer esa sesión. Angular los corre en orden y corta en
 * el primero que no pase.
 *
 * A dónde manda a quien no pasa:
 *   · sin sesión       → /login  (todavía no se identificó)
 *   · con rol distinto → a SU panel, con `?accesoDenegado=1`
 *
 * Esa diferencia importa: mandar a /login a alguien que YA inició sesión lo
 * hace pensar que se le venció la sesión, y va a reintentar en loop.
 *
 * Antes el rebote iba siempre a `/inicio`, una pantalla provisoria que no
 * tiene menú: la persona quedaba "afuera" del sistema y tenía que adivinar
 * cómo volver. Ahora vuelve a su propio panel (el mismo que elige el login,
 * `destinoSegunRoles`) y `EstructuraPanel` le muestra el cartel de acceso
 * denegado — criterio de Sprint 2 "Gestión de usuarios y roles": bloquear y
 * mostrar un mensaje, no redirigir en silencio.
 *
 * ⚠️ Esto NO es seguridad, igual que `authGuard`. Un guard corre en el
 * navegador y cualquiera puede saltearlo con las herramientas de
 * desarrollador. Es para que la aplicación se comporte bien.
 *
 * La protección de verdad va en el backend, con `[Authorize(Roles = "...")]`
 * en cada endpoint. Si esto fuera lo único, bastaría con llamar a la API
 * desde Postman para saltearlo entero.
 */
export function roleGuard(...permitidos: readonly string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const sesion = auth.sesion();

    if (sesion === null) {
      return router.createUrlTree(['/login']);
    }

    if (tieneAlgunRol(sesion, permitidos)) {
      return true;
    }

    // Sin ningún rol, `destinoSegunRoles` devuelve `/inicio`, que no tiene
    // `roleGuard`: no hay forma de que esto rebote en círculo.
    return router.createUrlTree([destinoSegunRoles(sesion)], {
      queryParams: { [PARAMETRO_ACCESO_DENEGADO]: 1 },
    });
  };
}
