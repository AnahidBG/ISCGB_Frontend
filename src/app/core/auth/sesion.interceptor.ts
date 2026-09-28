import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { RUTAS_API, URL_BASE_API } from '../configuracion/api';
import { PARAMETRO_SESION_VENCIDA } from './auth.guard';
import { AuthService } from './auth.service';
import { destinoSegunRoles } from './destino-por-rol';
import { PARAMETRO_ACCESO_DENEGADO } from './role.guard';

/**
 * Reacciona a los 401 y 403 de NUESTRA API.
 *
 * Desde que el backend llama a `UseAuthentication()` / `UseAuthorization()`
 * (y `CertificadosController` ya tiene `[Authorize]`), un token vencido o
 * inválido vuelve como 401. Sin esto cada pantalla lo mostraba como "no
 * pudimos traer tus datos", que parece un problema de red y no lo es: la
 * persona tiene que volver a entrar.
 *
 *   · 401 → se cierra la sesión y se manda al login con el aviso de sesión
 *           vencida. El error se re-lanza igual, para que la pantalla que
 *           hizo el pedido apague su "cargando".
 *   · 403 → el token es válido pero ese rol no puede usar ese endpoint
 *           (`[Authorize(Roles = "...")]`). Se vuelve al panel propio con el
 *           cartel de acceso denegado, igual que hace `roleGuard`.
 *
 * El login queda afuera a propósito: ahí un 401 significa "DNI o contraseña
 * incorrectos", y eso lo maneja `AuthHttpService` con su propio mensaje.
 */
export const sesionInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  if (!peticion.url.startsWith(URL_BASE_API) || peticion.url === RUTAS_API.login) {
    return siguiente(peticion);
  }

  // `inject()` solo funciona en el cuerpo del interceptor, no adentro del
  // `catchError` (que corre más tarde, fuera del contexto de inyección).
  const auth = inject(AuthService);
  const router = inject(Router);

  return siguiente(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && auth.sesion() !== null) {
          auth.cerrarSesion();
          router.navigate(['/login'], { queryParams: { [PARAMETRO_SESION_VENCIDA]: 1 } });
        } else if (error.status === 403) {
          router.navigate([destinoSegunRoles(auth.sesion())], {
            queryParams: { [PARAMETRO_ACCESO_DENEGADO]: 1 },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
