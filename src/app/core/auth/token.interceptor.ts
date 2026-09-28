import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { URL_BASE_API } from '../configuracion/api';

/**
 * Agrega `Authorization: Bearer <token>` a las llamadas a nuestra API.
 *
 * El backend ya valida el token: `Program.cs` llama a `UseAuthentication()` /
 * `UseAuthorization()` y `CertificadosController` tiene `[Authorize]` (saca
 * el id de la persona del propio token, no de la URL). Sin este header, el
 * certificado de alumno regular respondería 401 siempre.
 *
 * Solo agrega el header a las URLs de NUESTRA API. Si algún día el frontend
 * pide algo a otro servidor (un mapa, una fuente, lo que sea), mandarle el
 * token de nuestro instituto sería filtrar una credencial a un tercero.
 *
 * Qué pasa cuando el backend lo rechaza (401/403) lo decide
 * `sesionInterceptor`, no este.
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
