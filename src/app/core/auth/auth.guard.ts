import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Deja pasar solo a quien tenga la sesión abierta.
 *
 * Se engancha a una ruta con `canActivate: [authGuard]`. Antes de mostrar la
 * pantalla, Angular pregunta acá. Si devuelve `true`, entra; si devuelve una
 * ruta, redirige a esa.
 *
 * Es una función, no una clase: desde Angular 15 los guards son funciones
 * comunes que usan `inject()`. Si ves un tutorial con
 * `implements CanActivate`, está viejo.
 *
 * ⚠️ Esto NO es seguridad. Un guard vive en el navegador, y cualquiera con
 * las herramientas de desarrollador puede saltearlo. Sirve para que la
 * aplicación se comporte bien, no para proteger datos.
 *
 * La seguridad de verdad está en el backend: cada endpoint privado valida el
 * token con `[Authorize(Roles = "...")]`. Si alguien fuerza la entrada a esta
 * pantalla, la va a ver vacía, porque la API no le va a contestar nada.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado()) {
    return true;
  }

  // `createUrlTree` en vez de `router.navigate()`: le devuelve a Angular el
  // destino para que cancele esta navegación y haga la otra, en un solo paso.
  return router.createUrlTree(['/login']);
};
