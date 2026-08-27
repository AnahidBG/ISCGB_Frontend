import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { URL_BASE_API } from '../configuracion/api';

/**
 * Agrega `Authorization: Bearer <token>` a las llamadas a nuestra API.
 *
 * Hoy el backend NO valida el token: `Program.cs` no llama a
 * `UseAuthentication()` / `UseAuthorization()` y ningún controlador tiene
 * `[Authorize]` (ver docs/verificacion-backend.md → punto 4). O sea que este
 * interceptor, por ahora, no cambia nada.
 *
 * Está igual por dos motivos concretos:
 *
 *   1. El día que el backend cierre ese hueco —que tiene que cerrarlo, es la
 *      regla de negocio #5 de CLAUDE.md— TODAS las pantallas empezarían a dar
 *      401 de golpe. Con esto ya puesto, ese día no se rompe nada.
 *   2. Mandar el token de más es inofensivo; que falte cuando hace falta, no.
 *
 * Solo agrega el header a las URLs de NUESTRA API. Si algún día el frontend
 * pide algo a otro servidor (un mapa, una fuente, lo que sea), mandarle el
 * token de nuestro instituto sería filtrar una credencial a un tercero.
 */
export const tokenInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  if (!peticion.url.startsWith(URL_BASE_API)) {
    return siguiente(peticion);
  }

  const token = inject(AuthService).sesion()?.token;
  if (token === undefined) {
    return siguiente(peticion);
  }

  return siguiente(
    peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
