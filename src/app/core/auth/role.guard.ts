import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { tieneAlgunRol } from './modelos/sesion';

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
 *   · sin sesión      → /login  (todavía no se identificó)
 *   · con rol distinto→ /inicio (ya entró, pero esta pantalla no es suya)
 *
 * Esa diferencia importa: mandar a /login a alguien que YA inició sesión lo
 * hace pensar que se le venció la sesión, y va a reintentar en loop.
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

    return router.createUrlTree(['/inicio']);
  };
}
