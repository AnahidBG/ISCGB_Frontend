import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { sesionVigente } from './modelos/sesion';

/** Query param con el que el login avisa que la sesión se cerró por vencimiento. */
export const PARAMETRO_SESION_VENCIDA = 'sesionVencida';

/**
 * Deja pasar solo a quien tenga la sesión abierta Y vigente.
 *
 * Se engancha a una ruta con `canActivate: [authGuard]`. Antes de mostrar la
 * pantalla, Angular pregunta acá. Si devuelve `true`, entra; si devuelve una
 * ruta, redirige a esa.
 *
 * Es una función, no una clase: desde Angular 15 los guards son funciones
 * comunes que usan `inject()`. Si ves un tutorial con
 * `implements CanActivate`, está viejo.
 *
 * Además de "¿hay sesión?", pregunta "¿el token sigue vivo?": los JWT del
 * backend duran 2 horas y antes solo se revisaba al recargar la página. Con
 * la pestaña abierta toda la tarde, la persona seguía navegando con un token
 * vencido y cada pantalla fallaba con un error genérico. Ahora, si venció, se
 * cierra la sesión y se la manda al login con un aviso que explica por qué.
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

  const sesion = auth.sesion();

  if (sesion === null) {
    // `createUrlTree` en vez de `router.navigate()`: le devuelve a Angular el
    // destino para que cancele esta navegación y haga la otra, en un solo paso.
    return router.createUrlTree(['/login']);
  }

  if (!sesionVigente(sesion)) {
    auth.cerrarSesion();
    return router.createUrlTree(['/login'], { queryParams: { [PARAMETRO_SESION_VENCIDA]: 1 } });
  }

  return true;
};
